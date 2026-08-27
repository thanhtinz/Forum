/**
 * Hằng số của phòng chat, tách riêng để phía trình duyệt dùng được.
 *
 * `shout.ts` có `import { db }` nên kéo cả Prisma vào gói tải về nếu component
 * client lỡ nhập từ đó. Mọi thứ thuần tuý nằm ở đây.
 */

/** Số câu giữ lại và hiển thị trong phòng. Cũ hơn thì tự rơi khỏi khung nhìn. */
export const SHOUT_TAKE = 60;
/**
 * Dài hơn thì phòng chat biến thành nơi đăng bài. Đúng tinh thần chatbox cũ.
 * Rộng tay hơn một chút so với chữ thuần vì một ảnh/GIF chèn vào đã là
 * `![tên](đường-dẫn-dài)` chiếm cả trăm ký tự.
 */
export const SHOUT_MAX_LEN = 500;
/** Giãn cách tối thiểu giữa hai câu của cùng một người. */
export const SHOUT_GAP_SECONDS = 3;
/** Trần theo phút, chặn kiểu dán liên hồi. */
export const SHOUT_PER_MINUTE = 12;
/** Coi là "đang trong phòng" nếu có mặt trong 3 phút gần đây. */
export const SHOUT_HERE_MS = 3 * 60 * 1000;
/** Số ngày giữ lại một câu trước khi dọn — chat là nói rồi trôi. */
export const SHOUT_KEEP_DAYS = 7;
/** Khoá `scope` của phòng chat trong bảng điểm danh. */
export const SHOUT_SCOPE = 'chat';

export interface ShoutItem {
  id: string;
  content: string;
  createdAt: Date;
  deleted: boolean;
  user: { username: string | null; name: string | null; image: string | null; level: number; role: string };
  replyTo: { id: string; username: string | null; content: string } | null;
}
