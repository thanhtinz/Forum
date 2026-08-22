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
