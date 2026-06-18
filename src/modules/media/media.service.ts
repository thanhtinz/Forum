import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { createId } from '@paralleldrive/cuid2';
import { PresignUploadDto } from './media.dto';
import { AdminConfigService } from '../admin/admin-config.service';

// Cấu trúc sẵn cho S3 / MinIO. Tự ký SigV4 bằng `crypto` built-in,
// không phụ thuộc aws-sdk. Nếu chưa cấu hình storage -> báo lỗi rõ ràng.
@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  // mặc định: ảnh + video + zip (file sản phẩm marketplace)
  private readonly allowedTypes = new Set([
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'application/zip',
    'application/pdf',
  ]);
  private readonly maxSize = 100 * 1024 * 1024; // 100MB

  constructor(private readonly config: AdminConfigService) {}

  // Trả về URL presigned PUT để client upload trực tiếp lên storage,
  // kèm publicUrl để lưu vào DB sau khi upload xong.
  async presignUpload(dto: PresignUploadDto) {
    if (!this.allowedTypes.has(dto.contentType)) {
      throw new BadRequestException(`Định dạng không được phép: ${dto.contentType}`);
    }
    if (dto.size && dto.size > this.maxSize) {
      throw new BadRequestException('File vượt quá giới hạn 100MB');
    }

    const cfg = await this.getStorageConfig();
    const key = this.buildObjectKey(dto.folder, dto.filename);
    const expires = 900; // 15 phút

    const uploadUrl = this.presignPutUrl(cfg, key, expires);
    const publicUrl = cfg.publicBaseUrl
      ? `${cfg.publicBaseUrl.replace(/\/$/, '')}/${key}`
      : this.objectUrl(cfg, key);

    return {
      method: 'PUT',
      uploadUrl,
      publicUrl,
      key,
      expiresIn: expires,
      headers: { 'Content-Type': dto.contentType },
    };
  }

  // ──────────────────────────────────────────────
  // CONFIG
  // ──────────────────────────────────────────────
  private async getStorageConfig() {
    // Ưu tiên cấu hình admin (nhóm "media"), fallback biến môi trường MEDIA_*
    const endpoint = await this.config.resolve<string>('media.endpoint', 'MEDIA_ENDPOINT', '');
    const bucket = await this.config.resolve<string>('media.bucket', 'MEDIA_BUCKET', '');
    const accessKey = await this.config.resolve<string>('media.accessKey', 'MEDIA_ACCESS_KEY', '');
    const secretKey = await this.config.resolve<string>('media.secretKey', 'MEDIA_SECRET_KEY', '');

    if (!endpoint || !bucket || !accessKey || !secretKey) {
      this.logger.warn('Storage (S3/MinIO) chưa được cấu hình đầy đủ');
      throw new ServiceUnavailableException(
        'Dịch vụ lưu trữ chưa được cấu hình. Vào Admin → Cấu hình → Lưu trữ Media (S3/MinIO) hoặc đặt MEDIA_ENDPOINT, MEDIA_BUCKET, MEDIA_ACCESS_KEY, MEDIA_SECRET_KEY',
      );
    }

    const forcePathStyle = await this.config.resolve<any>('media.forcePathStyle', 'MEDIA_FORCE_PATH_STYLE', true);

    return {
      endpoint: endpoint.replace(/\/$/, ''),
      bucket,
      accessKey,
      secretKey,
      region: await this.config.resolve<string>('media.region', 'MEDIA_REGION', 'us-east-1'),
      // MinIO mặc định dùng path-style. Chấp nhận cả boolean (admin) lẫn chuỗi 'false' (env)
      forcePathStyle: forcePathStyle !== false && forcePathStyle !== 'false',
      publicBaseUrl: await this.config.resolve<string>('media.publicUrl', 'MEDIA_PUBLIC_URL', ''),
    };
  }

  private buildObjectKey(folder: string | undefined, filename: string) {
    const safeFolder = (folder ?? 'uploads').replace(/[^a-z0-9/_-]/gi, '');
    const ext = (filename.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const now = new Date();
    const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const name = createId();
    return ext
      ? `${safeFolder}/${datePath}/${name}.${ext}`
      : `${safeFolder}/${datePath}/${name}`;
  }

  private objectUrl(cfg: Awaited<ReturnType<MediaService['getStorageConfig']>>, key: string) {
    const { host, basePath } = this.hostAndBasePath(cfg, key);
    return `${this.scheme(cfg.endpoint)}://${host}${basePath}`;
  }

  // ──────────────────────────────────────────────
  // AWS Signature V4 — presigned PUT (query string)
  // ──────────────────────────────────────────────
  private presignPutUrl(
    cfg: Awaited<ReturnType<MediaService['getStorageConfig']>>,
    key: string,
    expires: number,
  ): string {
    const { host, basePath } = this.hostAndBasePath(cfg, key);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;

    const query: Record<string, string> = {
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${cfg.accessKey}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(expires),
      'X-Amz-SignedHeaders': 'host',
    };

    const canonicalQuery = Object.keys(query)
      .sort()
      .map((k) => `${this.uriEncode(k)}=${this.uriEncode(query[k])}`)
      .join('&');

    const canonicalRequest = [
      'PUT',
      basePath,
      canonicalQuery,
      `host:${host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      this.sha256Hex(canonicalRequest),
    ].join('\n');

    const signingKey = this.signingKey(cfg.secretKey, dateStamp, cfg.region, 's3');
    const signature = createHmac('sha256', signingKey)
      .update(stringToSign, 'utf8')
      .digest('hex');

    return `${this.scheme(cfg.endpoint)}://${host}${basePath}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  private hostAndBasePath(
    cfg: Awaited<ReturnType<MediaService['getStorageConfig']>>,
    key: string,
  ): { host: string; basePath: string } {
    const endpointHost = cfg.endpoint.replace(/^https?:\/\//, '');
    const encodedKey = key
      .split('/')
      .map((p) => this.uriEncode(p))
      .join('/');

    if (cfg.forcePathStyle) {
      return { host: endpointHost, basePath: `/${cfg.bucket}/${encodedKey}` };
    }
    return { host: `${cfg.bucket}.${endpointHost}`, basePath: `/${encodedKey}` };
  }

  private signingKey(secret: string, dateStamp: string, region: string, service: string) {
    const kDate = createHmac('sha256', `AWS4${secret}`).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(region).digest();
    const kService = createHmac('sha256', kRegion).update(service).digest();
    return createHmac('sha256', kService).update('aws4_request').digest();
  }

  private sha256Hex(data: string) {
    return createHash('sha256').update(data, 'utf8').digest('hex');
  }

  private scheme(endpoint: string) {
    return endpoint.startsWith('http://') ? 'http' : 'https';
  }

  // RFC 3986 — không encode A-Za-z0-9-_.~
  private uriEncode(str: string) {
    return encodeURIComponent(str).replace(
      /[!'()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }
}
