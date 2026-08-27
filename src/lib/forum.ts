import type { ForumAccess } from '@prisma/client';

/** Nhãn + màu cho quyền đăng bài của diễn đàn. */
export const FORUM_ACCESS_BADGE: Record<ForumAccess, { label: string; className: string } | null> = {
  ALL: null,
  MEMBERS: { label: 'Thành viên', className: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-200' },
  MODERATORS: { label: 'Điều hành viên', className: 'bg-violet-100 text-violet-600 dark:bg-violet-950/50' },
};

/** Bảng màu nhấn kiểu zibll cho biểu tượng diễn đàn (khi diễn đàn không có màu riêng). */
const FORUM_TINTS = ['#2c7bfe', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9', '#ef4444'];

/** Chọn màu tint ổn định theo slug diễn đàn. */
export function forumTint(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return FORUM_TINTS[h % FORUM_TINTS.length];
}
