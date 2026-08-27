import type { Cosmetics } from './shop-const';
/**
 * Hằng số của bảng yêu cầu game — tách khỏi phần đụng Prisma để ô soạn chạy
 * trên trình duyệt nhập được giới hạn ký tự mà không kéo theo máy khách Prisma.
 */

export const REQUEST_TITLE_MAX = 120;
export const REQUEST_NOTE_MAX = 500;
export const REQUEST_ADMIN_NOTE_MAX = 300;
export const REQUEST_PAGE_SIZE = 20;
/** Số yêu cầu tối đa một người gửi trong một ngày. */
export const REQUEST_PER_DAY = 5;

export const REQUEST_STATUSES = ['PENDING', 'ACCEPTED', 'DONE', 'REJECTED'] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_LABELS: Record<RequestStatus, { label: string; chip: string }> = {
  PENDING: { label: 'Chờ duyệt', chip: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300' },
  ACCEPTED: { label: 'Đang tìm', chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50' },
  DONE: { label: 'Đã có game', chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50' },
  REJECTED: { label: 'Không làm được', chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50' },
};

export function isRequestStatus(v: string): v is RequestStatus {
  return (REQUEST_STATUSES as readonly string[]).includes(v);
}

export interface RequestItem {
  id: string;
  title: string;
  note: string | null;
  status: RequestStatus;
  adminNote: string | null;
  voteCount: number;
  createdAt: Date;
  handledAt: Date | null;
  user: { username: string | null; name: string | null; image: string | null; level: number; role: string; cosmetics: Cosmetics };
  game: { slug: string; title: string } | null;
  /** Người đang xem đã bấm "tôi cũng muốn" chưa. */
  voted: boolean;
  /** Người đang xem có được rút yêu cầu này không. */
  canRemove: boolean;
}
