import { db } from './db';

/** Chỉ ghi lại dấu hoạt động khi bản ghi cũ hơn 5 phút, tránh ghi DB mỗi request. */
const REFRESH_MS = 5 * 60 * 1000;

/**
 * Đánh dấu người dùng còn hoạt động (phục vụ danh sách "đang online").
 * Dùng updateMany có điều kiện nên chỉ tốn một câu lệnh, không cần đọc trước.
 */
export async function touchPresence(userId: string): Promise<void> {
  const stale = new Date(Date.now() - REFRESH_MS);
  await db.user
    .updateMany({
      where: { id: userId, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: stale } }] },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});
}
