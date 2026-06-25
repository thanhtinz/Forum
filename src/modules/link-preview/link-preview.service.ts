import { Injectable, BadRequestException } from '@nestjs/common';
import * as https from 'https';
import * as http from 'http';

export interface LinkPreviewResult {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: string;
}

@Injectable()
export class LinkPreviewService {
  private readonly TIMEOUT_MS = 5000;
  private readonly MAX_SIZE = 512 * 1024; // 512 KB

  async preview(rawUrl: string): Promise<LinkPreviewResult> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('URL không hợp lệ');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new BadRequestException('Chỉ hỗ trợ http/https');
    }

    const html = await this.fetchHtml(url.toString());
    return { url: url.toString(), ...this.extractMeta(html) };
  }

  private fetchHtml(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)' },
        timeout: this.TIMEOUT_MS,
      }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.fetchHtml(res.headers.location).then(resolve).catch(reject);
        }
        const ct = res.headers['content-type'] || '';
        if (!ct.includes('text/html')) { reject(new BadRequestException('Không phải trang HTML')); return; }

        let data = '';
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > this.MAX_SIZE) { req.destroy(); resolve(data); return; }
          data += chunk.toString();
        });
        res.on('end', () => resolve(data));
        res.on('error', reject);
      });
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.on('error', reject);
    });
  }

  private extractMeta(html: string): Omit<LinkPreviewResult, 'url'> {
    const og = (prop: string) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'));
      return m?.[1]?.trim();
    };
    const tw = (name: string) => {
      const m = html.match(new RegExp(`<meta[^>]+name=["']twitter:${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:${name}["']`, 'i'));
      return m?.[1]?.trim();
    };
    const meta = (name: string) => {
      const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'));
      return m?.[1]?.trim();
    };
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();

    return {
      title: og('title') || tw('title') || titleTag,
      description: og('description') || tw('description') || meta('description'),
      image: og('image') || tw('image'),
      siteName: og('site_name'),
      type: og('type'),
    };
  }
}
