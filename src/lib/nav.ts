import { db } from './db';

export const NAV_GROUPS = [
  { value: 'header', label: 'Menu trên đầu trang' },
  { value: 'footer', label: 'Menu chân trang' },
] as const;

export type NavGroup = (typeof NAV_GROUPS)[number]['value'];

export interface NavItem {
  id: string;
  label: string;
  url: string;
  icon: string | null;
  children: { id: string; label: string; url: string; icon: string | null }[];
}

/**
 * Menu mặc định khi admin chưa cấu hình gì, để trang không trống menu ở lần chạy đầu.
 * Không có mục "Bài viết" (/blog) vì trang chủ đã là diễn đàn; ai cần vẫn tự thêm được.
 */
export const NAV_DEFAULTS: Record<NavGroup, { label: string; url: string; icon: string }[]> = {
  header: [
    { label: 'Diễn đàn', url: '/', icon: '💬' },
    { label: 'Cửa hàng', url: '/shop', icon: '🛍️' },
    { label: 'VIP', url: '/vip', icon: '👑' },
  ],
  footer: [
    { label: 'Diễn đàn', url: '/', icon: '' },
    { label: 'Cửa hàng', url: '/shop', icon: '' },
    { label: 'VIP', url: '/vip', icon: '' },
    { label: 'Tìm kiếm', url: '/search', icon: '' },
  ],
};

/** Lấy menu theo nhóm, gom sẵn mục con vào mục cha. */
export async function getNavItems(group: NavGroup): Promise<NavItem[]> {
  const rows = await db.navLink
    .findMany({ where: { group }, orderBy: [{ order: 'asc' }, { label: 'asc' }], select: { id: true, label: true, url: true, icon: true, parentId: true } })
    .catch(() => []);

  if (rows.length === 0) {
    return NAV_DEFAULTS[group].map((d, i) => ({ id: `default-${i}`, label: d.label, url: d.url, icon: d.icon || null, children: [] }));
  }

  const roots = rows.filter((r) => !r.parentId);
  return roots.map((r) => ({
    id: r.id, label: r.label, url: r.url, icon: r.icon,
    children: rows.filter((c) => c.parentId === r.id).map((c) => ({ id: c.id, label: c.label, url: c.url, icon: c.icon })),
  }));
}

/**
 * Đường dẫn cho menu: chỉ nhận đường dẫn nội bộ hoặc http(s).
 * Chặn javascript: và các scheme lạ để không biến menu thành chỗ chèn mã.
 */
export function isSafeNavUrl(url: string): boolean {
  return /^\/[^\s]*$/.test(url) || /^https?:\/\/\S+$/.test(url);
}
