import { db } from './db';

/**
 * Dấu "chủ đề có bài mới" — cái chấm đỏ của forum ngày trước.
 *
 * Cách tính gọn nhất có thể: một chủ đề là MỚI với ai đó nếu hoạt động cuối
 * của nó (`lastReplyAt`, không có thì `createdAt`) muộn hơn cả hai mốc —
 * lần cuối người ấy mở chính chủ đề đó, và mốc "đã đọc hết" chung của họ.
 *
 * Không đếm bài chưa đọc, chỉ so mốc: danh sách chủ đề chỉ cần biết "có gì
 * mới sau lần mình ghé không", mà so mốc thì một truy vấn là xong cho cả
 * trang, còn đếm bài thì mỗi dòng một lần đếm.
 */

/** Người chưa đăng nhập không có dấu nào — trả về tập rỗng cho gọn chỗ gọi. */
const NONE: ReadonlySet<string> = new Set();

export interface ReadableThread {
  id: string;
  createdAt: Date;
  lastReplyAt: Date | null;
}

/**
 * Trong số chủ đề đang hiện trên trang, cái nào là mới với người này.
 *
 * Chỉ hỏi về đúng những id đang hiện (một trang danh sách), nên số hàng đọc
 * về luôn có trần bằng cỡ trang.
 */
export async function unreadThreadIds(
  userId: string | null,
  threads: ReadableThread[],
): Promise<ReadonlySet<string>> {
  if (!userId || threads.length === 0) return NONE;

  const ids = threads.map((t) => t.id);
  const [me, reads] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { forumReadAt: true } }),
    db.threadRead.findMany({
      where: { userId, threadId: { in: ids } },
      select: { threadId: true, readAt: true },
    }),
  ]);

  const readAt = new Map(reads.map((r) => [r.threadId, r.readAt.getTime()]));
  const allRead = me?.forumReadAt?.getTime() ?? 0;

  const unread = new Set<string>();
  for (const t of threads) {
    const active = (t.lastReplyAt ?? t.createdAt).getTime();
    if (active > Math.max(allRead, readAt.get(t.id) ?? 0)) unread.add(t.id);
  }
  return unread;
}

/**
 * Ghi lại "vừa mở chủ đề này".
 *
 * Gọi lúc dựng trang chủ đề và KHÔNG chờ kết quả: hỏng thì cùng lắm chủ đề ấy
 * còn dấu mới thêm một lượt, không đáng để chặn cả trang.
 */
export async function markThreadRead(userId: string, threadId: string): Promise<void> {
  const readAt = new Date();
  await db.threadRead.upsert({
    where: { userId_threadId: { userId, threadId } },
    update: { readAt },
    create: { userId, threadId, readAt },
    select: { id: true },
  });
}

/**
 * "Đánh dấu đã đọc hết".
 *
 * Đẩy mốc chung lên hiện tại rồi dọn luôn những hàng ThreadRead cũ hơn mốc:
 * từ giờ chúng không đổi được kết quả nào nữa, giữ lại chỉ tổ phình bảng.
 */
export async function markAllThreadsRead(userId: string): Promise<void> {
  const now = new Date();
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { forumReadAt: now }, select: { id: true } }),
    db.threadRead.deleteMany({ where: { userId, readAt: { lte: now } } }),
  ]);
}
