import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, createHmac } from 'crypto';
import { createId } from '@paralleldrive/cuid2';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

export interface AttachmentConfig {
  enabled: boolean;
  endpoint: string; // vd https://<account>.r2.cloudflarestorage.com
  bucket: string;
  accessKey: string;
  secretKey: string;
  region: string;
  publicUrl: string; // URL công khai gốc, vd https://files.example.com (map tới bucket)
  forcePathStyle: boolean;
}

const CONFIG_KEY = 'attachment.config';
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
const MAX_SIZE = 50 * 1024 * 1024; // 50MB
// Chặn các loại nguy hiểm (thực thi / có thể XSS khi mở trực tiếp)
const BLOCKED_EXT = new Set(['exe', 'bat', 'cmd', 'sh', 'msi', 'js', 'html', 'htm', 'svg', 'php']);

// Upload tệp đính kèm lên R2/S3 (admin cấu hình) — fallback lưu local nếu chưa bật.
@Injectable()
export class AttachmentService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<AttachmentConfig> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: CONFIG_KEY } }).catch(() => null);
    const v = (cfg?.value as any) || {};
    return {
      enabled: !!v.enabled,
      endpoint: typeof v.endpoint === 'string' ? v.endpoint.replace(/\/$/, '') : '',
      bucket: v.bucket || '',
      accessKey: v.accessKey || '',
      secretKey: v.secretKey || '',
      region: v.region || 'auto',
      publicUrl: typeof v.publicUrl === 'string' ? v.publicUrl.replace(/\/$/, '') : '',
      forcePathStyle: v.forcePathStyle !== false,
    };
  }

  async setConfig(dto: Partial<AttachmentConfig>): Promise<AttachmentConfig> {
    const cur = await this.getConfig();
    const next: AttachmentConfig = {
      enabled: dto.enabled ?? cur.enabled,
      endpoint: (dto.endpoint ?? cur.endpoint).replace(/\/$/, ''),
      bucket: dto.bucket ?? cur.bucket,
      accessKey: dto.accessKey ?? cur.accessKey,
      secretKey: dto.secretKey ?? cur.secretKey,
      region: dto.region ?? cur.region,
      publicUrl: (dto.publicUrl ?? cur.publicUrl).replace(/\/$/, ''),
      forcePathStyle: dto.forcePathStyle ?? cur.forcePathStyle,
    };
    await this.prisma.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: next as any },
      create: { key: CONFIG_KEY, value: next as any },
    });
    return next;
  }

  async isEnabled(): Promise<boolean> {
    const c = await this.getConfig();
    return c.enabled && !!c.endpoint && !!c.bucket && !!c.accessKey && !!c.secretKey;
  }

  async upload(buffer: Buffer, filename: string, mimetype: string): Promise<{ url: string; filename: string; size: number }> {
    if (buffer.length > MAX_SIZE) throw new BadRequestException('Tệp vượt quá giới hạn 50MB');
    const ext = (extname(filename || '').slice(1) || '').toLowerCase();
    if (BLOCKED_EXT.has(ext)) throw new BadRequestException(`Không cho phép tệp .${ext}`);

    const cfg = await this.getConfig();
    if (cfg.enabled && cfg.endpoint && cfg.bucket && cfg.accessKey && cfg.secretKey) {
      const key = this.buildKey(ext);
      await this.putObject(cfg, key, buffer, mimetype || 'application/octet-stream');
      const base = cfg.publicUrl || this.objectBase(cfg, key);
      const url = cfg.publicUrl ? `${cfg.publicUrl}/${key}` : base;
      return { url, filename, size: buffer.length };
    }
    // Fallback local
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    const fn = `${createId()}${ext ? '.' + ext : ''}`;
    writeFileSync(join(UPLOAD_DIR, fn), buffer);
    return { url: `/uploads/${fn}`, filename, size: buffer.length };
  }

  private buildKey(ext: string) {
    const now = new Date();
    const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    return `attachments/${datePath}/${createId()}${ext ? '.' + ext : ''}`;
  }

  private objectBase(cfg: AttachmentConfig, key: string) {
    const host = cfg.endpoint.replace(/^https?:\/\//, '');
    return cfg.forcePathStyle
      ? `${this.scheme(cfg.endpoint)}://${host}/${cfg.bucket}/${key}`
      : `${this.scheme(cfg.endpoint)}://${cfg.bucket}.${host}/${key}`;
  }

  // ── SigV4 PUT (authorization header, payload đã ký) ──
  private async putObject(cfg: AttachmentConfig, key: string, body: Buffer, contentType: string) {
    const host = cfg.endpoint.replace(/^https?:\/\//, '');
    const encodedKey = key.split('/').map((p) => this.uriEncode(p)).join('/');
    const path = cfg.forcePathStyle ? `/${cfg.bucket}/${encodedKey}` : `/${encodedKey}`;
    const reqHost = cfg.forcePathStyle ? host : `${cfg.bucket}.${host}`;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash('sha256').update(body).digest('hex');
    const scope = `${dateStamp}/${cfg.region}/s3/aws4_request`;
    const canonicalHeaders = `host:${reqHost}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = ['PUT', path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const signingKey = this.signingKey(cfg.secretKey, dateStamp, cfg.region, 's3');
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const url = `${this.scheme(cfg.endpoint)}://${reqHost}${path}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: authorization,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': payloadHash,
        'Content-Type': contentType,
      },
      body: new Uint8Array(body),
    }).catch((e) => { throw new BadRequestException('Không kết nối được kho lưu trữ: ' + (e?.message || '')); });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new BadRequestException(`Upload tệp thất bại (HTTP ${res.status}) ${txt.slice(0, 200)}`);
    }
  }

  private signingKey(secret: string, dateStamp: string, region: string, service: string) {
    const kDate = createHmac('sha256', `AWS4${secret}`).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(region).digest();
    const kService = createHmac('sha256', kRegion).update(service).digest();
    return createHmac('sha256', kService).update('aws4_request').digest();
  }
  private scheme(endpoint: string) { return endpoint.startsWith('http://') ? 'http' : 'https'; }
  private uriEncode(str: string) {
    return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  }
}
