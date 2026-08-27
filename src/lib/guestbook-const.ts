/**
 * Hằng số của sổ lưu bút, tách riêng khỏi `guestbook.ts`.
 *
 * Tệp kia đụng tới Prisma, mà ô soạn lời nhắn chạy trên trình duyệt cũng cần
 * biết giới hạn ký tự — nhập thẳng từ đó là kéo cả máy khách Prisma vào gói
 * giao diện.
 */

/** Mỗi lời nhắn dài tối đa bấy nhiêu ký tự. */
export const GUESTBOOK_MAX_LEN = 1000;
/** Hồi âm của chủ nhà ngắn hơn — nó chỉ là một câu đáp lễ. */
export const GUESTBOOK_REPLY_MAX_LEN = 500;
/** Số lời nhắn mỗi trang. */
export const GUESTBOOK_PAGE_SIZE = 10;
/** Khoảng cách tối thiểu giữa hai lần ghi sổ, tính bằng giây. */
export const GUESTBOOK_GAP_SECONDS = 30;
/** Số lời nhắn tối đa một người được ghi cho cùng một chủ nhà trong một ngày. */
export const GUESTBOOK_PER_DAY = 10;

export interface GuestbookItem {
  id: string;
  content: string;
  reply: string | null;
  repliedAt: Date | null;
  private: boolean;
  hidden: boolean;
  createdAt: Date;
  author: { id: string; username: string | null; name: string | null; image: string | null; level: number; role: string };
  /** Người xem hiện tại có được gỡ lời nhắn này không. */
  canRemove: boolean;
}

export interface Viewer {
  id: string | null;
  role?: string | null;
}

/** Quản trị viên và điều hành viên xem được cả lời nhắn kín lẫn lời đã gỡ. */
export function isStaff(viewer: Viewer): boolean {
  return viewer.role === 'ADMIN' || viewer.role === 'MODERATOR';
}

/**
 * Ai được gỡ một lời nhắn: người viết ra nó, chủ nhà (sổ là của mình), và
 * ban điều hành.
 */
export function canRemoveEntry(viewer: Viewer, ownerId: string, authorId: string): boolean {
  if (!viewer.id) return false;
  return viewer.id === authorId || viewer.id === ownerId || isStaff(viewer);
}
