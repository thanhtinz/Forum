import { db } from './db';

export const GIF_SETTING_KEY = 'gif_provider';

export type GifProvider = 'tenor' | 'giphy';

export interface GifConfig {
  provider: GifProvider;
  apiKey: string;
  /** Bật/tắt tab GIF ở khung soạn trả lời. */
  enabled: boolean;
}

export const DEFAULT_GIF_CONFIG: GifConfig = { provider: 'tenor', apiKey: '', enabled: false };

/** Đọc cấu hình GIF do quản trị đặt. Không bao giờ trả khoá API ra client. */
export async function getGifConfig(): Promise<GifConfig> {
  const row = await db.siteSetting.findUnique({ where: { key: GIF_SETTING_KEY } });
  const v = (row?.value ?? {}) as Partial<GifConfig>;
  return {
    provider: v.provider === 'giphy' ? 'giphy' : 'tenor',
    apiKey: typeof v.apiKey === 'string' ? v.apiKey : '',
    enabled: !!v.enabled && !!v.apiKey,
  };
}

export interface GifItem {
  id: string;
  /** Ảnh động dùng để chèn vào nội dung. */
  url: string;
  /** Ảnh xem trước nhẹ hơn cho lưới chọn. */
  preview: string;
  width?: number;
  height?: number;
  description?: string;
}

interface TenorResult {
  id: string;
  content_description?: string;
  media_formats?: Record<string, { url?: string; dims?: number[] }>;
}
interface GiphyResult {
  id: string;
  title?: string;
  images?: { downsized?: { url?: string; width?: string; height?: string }; fixed_width_small?: { url?: string } };
}

/**
 * Tìm GIF qua nhà cung cấp đã cấu hình. Gọi từ server (route handler) để khoá
 * API không lộ ra trình duyệt.
 */
export async function searchGifs(cfg: GifConfig, query: string, limit = 24): Promise<GifItem[]> {
  if (!cfg.enabled || !cfg.apiKey) return [];
  const q = query.trim();

  try {
    if (cfg.provider === 'giphy') {
      const base = q ? 'https://api.giphy.com/v1/gifs/search' : 'https://api.giphy.com/v1/gifs/trending';
      const p = new URLSearchParams({ api_key: cfg.apiKey, limit: String(limit), rating: 'g' });
      if (q) p.set('q', q);
      const r = await fetch(`${base}?${p}`, { cache: 'no-store' });
      if (!r.ok) return [];
      const j = (await r.json()) as { data?: GiphyResult[] };
      return (j.data ?? []).flatMap((g) => {
        const url = g.images?.downsized?.url;
        if (!url) return [];
        return [{
          id: g.id,
          url,
          preview: g.images?.fixed_width_small?.url ?? url,
          width: Number(g.images?.downsized?.width) || undefined,
          height: Number(g.images?.downsized?.height) || undefined,
          description: g.title,
        }];
      });
    }

    // Tenor v2
    const base = q ? 'https://tenor.googleapis.com/v2/search' : 'https://tenor.googleapis.com/v2/featured';
    const p = new URLSearchParams({ key: cfg.apiKey, limit: String(limit), contentfilter: 'high', client_key: 'nova' });
    if (q) p.set('q', q);
    const r = await fetch(`${base}?${p}`, { cache: 'no-store' });
    if (!r.ok) return [];
    const j = (await r.json()) as { results?: TenorResult[] };
    return (j.results ?? []).flatMap((g) => {
      const full = g.media_formats?.gif ?? g.media_formats?.mediumgif;
      const url = full?.url;
      if (!url) return [];
      return [{
        id: g.id,
        url,
        preview: g.media_formats?.tinygif?.url ?? url,
        width: full?.dims?.[0],
        height: full?.dims?.[1],
        description: g.content_description,
      }];
    });
  } catch {
    return [];
  }
}
