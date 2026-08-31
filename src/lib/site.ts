import { db } from './db';
import { chuanHoaHoaHong } from './revenue-share';
import { SITE_DEFAULTS, SITE_SETTING_KEY, type SiteSettings } from './site-const';

export * from './site-const';

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
    hoaHongPhanTram: chuanHoaHoaHong(v.hoaHongPhanTram),
  };
}
