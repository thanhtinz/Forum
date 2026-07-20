import type { ForumAccess } from '@prisma/client';

/** Nhãn + màu cho quyền đăng bài của diễn đàn. */
export const FORUM_ACCESS_BADGE: Record<ForumAccess, { label: string; className: string } | null> = {
  ALL: null,
  MEMBERS: { label: 'Thành viên', className: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-200' },
  VIP: { label: 'VIP', className: 'bg-amber-100 text-amber-600 dark:bg-amber-950/50' },
  MODERATORS: { label: 'Điều hành viên', className: 'bg-violet-100 text-violet-600 dark:bg-violet-950/50' },
};
