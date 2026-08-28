import type { Prisma } from '@prisma/client';
import { db } from './db';

/**
 * Bộ đếm của chuyên mục và chủ đề.
 *
 * Trước đây mỗi đường đi tự cộng trừ lấy: ẩn chủ đề thì trừ, hiện lại thì
 * không cộng, xoá chủ đề thì quên trừ trả lời, bấm "ẩn" hai lần thì trừ hai
 * lần. Mỗi chỗ sai một kiểu, mà sai rồi thì lệch VĨNH VIỄN — không có gì kéo
 * con số về đúng nữa.
 *
 * Nên ở đây không cộng trừ mà ĐẾM LẠI từ dữ liệu thật. Đếm lại đắt hơn một
 * phép trừ, nhưng nó đúng bất kể trước đó đã xảy ra chuyện gì: bấm hai lần,
 * hai người bấm cùng lúc, hay dữ liệu vốn đã lệch sẵn từ hôm qua. Những chỗ
 * gọi tới đều là thao tác điều hành hiếm khi xảy ra — riêng đường nóng (đăng
 * bài, trả lời) vẫn dùng `increment` vì ở đó phép cộng chắc chắn đúng.
 *
 * Quy ước con số:
 *   • `Forum.threadCount`  — số chủ đề đang HIỆN (status = PUBLISHED),
 *   • `Forum.replyCount`   — số trả lời chưa ẩn nằm trong các chủ đề đang hiện,
 *   • `Thread.replyCount`  — số trả lời chưa ẩn của riêng chủ đề đó.
 */

type Client = Prisma.TransactionClient | typeof db;

/** Đếm lại số trả lời hiện ra của một chủ đề. */
export async function recountThread(threadId: string, client: Client = db): Promise<number> {
  const n = await client.reply.count({ where: { threadId, hidden: false } });
  await client.thread.update({ where: { id: threadId }, data: { replyCount: n }, select: { id: true } });
  return n;
}

/** Đếm lại cả hai con số của một chuyên mục. */
export async function recountForum(
  forumId: string,
  client: Client = db,
): Promise<{ threadCount: number; replyCount: number }> {
  // Đếm nối tiếp chứ không Promise.all: trong transaction thì hai truy vấn đi
  // chung một kết nối, chạy song song chẳng nhanh hơn mà lại dễ vướng nhau.
  const threadCount = await client.thread.count({ where: { forumId, status: 'PUBLISHED' } });
  const replyCount = await client.reply.count({
    where: { hidden: false, thread: { forumId, status: 'PUBLISHED' } },
  });
  await client.forum.update({
    where: { id: forumId }, data: { threadCount, replyCount }, select: { id: true },
  });
  return { threadCount, replyCount };
}

/** Đếm lại nhiều chuyên mục (chuyển chủ đề thì phải chỉnh cả hai đầu). */
export async function recountForums(forumIds: (string | null | undefined)[], client: Client = db) {
  for (const id of [...new Set(forumIds.filter((x): x is string => !!x))]) {
    await recountForum(id, client);
  }
}
