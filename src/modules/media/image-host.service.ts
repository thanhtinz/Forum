import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ImageHostConfig {
  enabled: boolean;
  endpoint: string; // URL upload Chevereto, vd https://zpic.live/api/1/upload
  apiKey: string;
}

const CONFIG_KEY = 'imagehost.config';
const DEFAULT_ENDPOINT = 'https://zpic.live/api/1/upload';

// Upload ảnh qua dịch vụ ngoài kiểu Chevereto (zpic.live / anh.moe).
// API: POST multipart { key, source, format=json } -> { image: { url } }
@Injectable()
export class ImageHostService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<ImageHostConfig> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: CONFIG_KEY } }).catch(() => null);
    const v = (cfg?.value as any) || {};
    return {
      enabled: !!v.enabled,
      endpoint: typeof v.endpoint === 'string' && v.endpoint.trim() ? v.endpoint.trim() : DEFAULT_ENDPOINT,
      apiKey: typeof v.apiKey === 'string' ? v.apiKey : '',
    };
  }

  async setConfig(dto: Partial<ImageHostConfig>): Promise<ImageHostConfig> {
    const cur = await this.getConfig();
    const next: ImageHostConfig = {
      enabled: dto.enabled ?? cur.enabled,
      endpoint: (dto.endpoint ?? cur.endpoint).trim() || DEFAULT_ENDPOINT,
      apiKey: dto.apiKey ?? cur.apiKey,
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
    return c.enabled && !!c.apiKey && !!c.endpoint;
  }

  /** Upload buffer ảnh lên dịch vụ ngoài, trả về URL công khai. */
  async upload(buffer: Buffer, filename: string, mimetype: string): Promise<{ url: string }> {
    const cfg = await this.getConfig();
    if (!cfg.enabled || !cfg.apiKey) {
      throw new BadRequestException('Dịch vụ lưu trữ ảnh ngoài chưa được cấu hình');
    }
    const form = new FormData();
    form.append('key', cfg.apiKey);
    form.append('format', 'json');
    const bytes = new Uint8Array(buffer);
    form.append('source', new Blob([bytes], { type: mimetype || 'image/png' }), filename || 'image.png');

    let json: any;
    try {
      const res = await fetch(cfg.endpoint, { method: 'POST', body: form as any });
      json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new BadRequestException(json?.error?.message || `Upload thất bại (HTTP ${res.status})`);
      }
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Không kết nối được dịch vụ lưu trữ ảnh');
    }
    const url = json?.image?.url || json?.image?.display_url || json?.data?.url;
    if (!url) throw new BadRequestException('Dịch vụ ảnh không trả về URL hợp lệ');
    return { url };
  }
}
