/**
 * Hằng số và nhãn của album ảnh, tách khỏi phần đụng Prisma để biểu mẫu chạy
 * trên trình duyệt dùng chung được mà không kéo theo máy khách Prisma.
 */

export const ALBUM_NAME_MAX = 80;
export const ALBUM_DESC_MAX = 300;
export const CAPTION_MAX = 200;

/** Số album mỗi trang, và số ảnh mỗi trang khi xem một album. */
export const ALBUM_PAGE_SIZE = 12;
export const PHOTO_PAGE_SIZE = 24;

/** Trần số album và số ảnh mỗi album cho một người. */
export const ALBUM_LIMIT = 30;
export const PHOTO_PER_ALBUM_LIMIT = 300;

export const PRIVACIES = ['PUBLIC', 'FRIENDS', 'PRIVATE'] as const;
export type Privacy = (typeof PRIVACIES)[number];

export const PRIVACY_LABELS: Record<Privacy, { label: string; hint: string; chip: string }> = {
  PUBLIC: {
    label: 'Công khai', hint: 'Ai ghé trang cá nhân cũng xem được.',
    chip: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  },
  FRIENDS: {
    label: 'Chỉ bạn bè', hint: 'Chỉ những người đã kết bạn hai chiều với bạn.',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50',
  },
  PRIVATE: {
    label: 'Riêng tư', hint: 'Chỉ mình bạn.',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50',
  },
};

export function isPrivacy(v: string): v is Privacy {
  return (PRIVACIES as readonly string[]).includes(v);
}

export interface AlbumCard {
  id: string;
  name: string;
  description: string | null;
  cover: string | null;
  privacy: Privacy;
  photoCount: number;
  createdAt: Date;
}

export interface PhotoItem {
  id: string;
  url: string;
  caption: string | null;
  createdAt: Date;
}
