import { db } from './db';

/** URL gốc của trang, dùng cho SEO (sitemap, robots, Open Graph). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const SITE_NAME = 'Nova Platform';
export const SITE_DESCRIPTION = 'Diễn đàn và kho game, tính điểm thay cho tiền.';

export const SITE_SETTING_KEY = 'site_general';

export interface SiteSettings {
  name: string;
  /** Chữ nhỏ cạnh tên, để trống thì không hiện. */
  tagline: string;
  /** Ảnh logo; để trống thì hiện chữ cái đầu của tên. */
  logo: string;
  /** Mô tả dùng cho thẻ SEO của trang chủ. */
  description: string;
  /** Dòng bản quyền ở chân trang. */
  footerText: string;
}

export const SITE_DEFAULTS: SiteSettings = {
  name: 'Nova',
  tagline: '',
  logo: '',
  description: SITE_DESCRIPTION,
  footerText: `${SITE_NAME}. Diễn đàn và kho game.`,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const row = await db.siteSetting.findUnique({ where: { key: SITE_SETTING_KEY } }).catch(() => null);
  const v = (row?.value ?? {}) as Partial<SiteSettings>;
  // Trộn với mặc định để thiếu trường nào vẫn có giá trị dùng được.
  return {
    name: v.name?.trim() || SITE_DEFAULTS.name,
    tagline: v.tagline?.trim() ?? SITE_DEFAULTS.tagline,
    logo: v.logo?.trim() ?? SITE_DEFAULTS.logo,
    description: v.description?.trim() || SITE_DEFAULTS.description,
    footerText: v.footerText?.trim() || SITE_DEFAULTS.footerText,
  };
}
