import { db } from './db';

/**
 * Cặp id đã sắp xếp. Hội thoại 1–1 luôn lưu theo thứ tự này để một cặp
 * chỉ sinh đúng một bản ghi, dù ai nhắn trước.
 */
export function pairKey(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

/** Người còn lại trong hội thoại. */
export function otherId(convo: { userAId: string; userBId: string }, me: string): string {
  return convo.userAId === me ? convo.userBId : convo.userAId;
}

/** Số tin chưa đọc gửi tới người này (không tính tin do chính họ gửi). */
export async function countUnreadMessages(userId: string): Promise<number> {
  return db.message.count({
    where: {
      readAt: null,
      senderId: { not: userId },
      conversation: { OR: [{ userAId: userId }, { userBId: userId }] },
    },
  });
}

export const MESSAGE_MAX_LENGTH = 2000;

/**
 * Tóm tắt tin để hiện ở hộp thư: ảnh/sticker/GIF lưu dạng ![alt](url)
 * nên phải đổi thành chữ, không thì danh sách hiện đầy cú pháp markdown.
 */
export function messagePreview(content: string): string {
  const stripped = content.replace(/!\[[^\]]*\]\([^)\s]+\)/g, ' 📷 Ảnh ').replace(/\s+/g, ' ').trim();
  return stripped || '📷 Ảnh';
}

/**
 * Xoá tin đã quá hạn của một hội thoại.
 *
 * Dọn ngay lúc mở hội thoại thay vì chạy nền: không có hàng đợi nền nào ở đây,
 * mà tin quá hạn thì không được hiện ra nữa — dọn tại chỗ là chắc chắn nhất.
 *
 * `from` là mốc bật tính năng: tin gửi trước đó không bị đụng tới, nếu không
 * thì vừa bật lên là bay sạch lịch sử cũ.
 *
 * Hàm này CỐ Ý nằm ở đây chứ không nằm trong tệp `'use server'`. Mọi hàm được
 * export từ tệp `'use server'` đều là một endpoint POST công khai — hàm này lại
 * nhận thẳng `conversationId` và mốc thời gian rồi `deleteMany`, nên đặt ở đó
 * là ai cũng gọi được để xoá sạch tin của hội thoại người khác. Chỗ gọi duy
 * nhất (trang hội thoại) đã kiểm người xem có trong hội thoại trước khi gọi.
 */
export async function purgeExpiredMessages(conversationId: string, hours: number, from: Date) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  if (from >= cutoff) return; // chưa có tin nào kịp quá hạn
  await db.message.deleteMany({
    where: { conversationId, createdAt: { gte: from, lt: cutoff } },
  });
}
