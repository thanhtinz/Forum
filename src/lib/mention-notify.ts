import type { Prisma } from '@prisma/client';
import { db } from './db';
import { notify } from './notify';
import { isBlockedBetween } from './block';
import { extractMentions, MENTION_LIMIT } from './mention';

export interface MentionTarget { id: string; username: string }

/**
 * Đổi tên đăng nhập trong nội dung thành người dùng thật.
 *
 * Bỏ qua chính mình, những người đã được báo bằng thông báo khác (chủ chủ đề,
 * người được phản hồi…) và những ai có quan hệ chặn với người viết — nhắc tên
 * không được phép lách chức năng chặn.
 */
export async function resolveMentions(
  content: string,
  actorId: string,
  skipUserIds: (string | null | undefined)[] = [],
): Promise<MentionTarget[]> {
  const names = extractMentions(content);
  if (names.length === 0) return [];

  const skip = new Set([actorId, ...skipUserIds.filter((x): x is string => !!x)]);
  const users = await db.user.findMany({
    where: { username: { in: names, mode: 'insensitive' }, status: 'ACTIVE' },
    select: { id: true, username: true },
    take: MENTION_LIMIT,
  });

  const out: MentionTarget[] = [];
  for (const u of users) {
    if (!u.username || skip.has(u.id)) continue;
    if (await isBlockedBetween(actorId, u.id)) continue;
    out.push({ id: u.id, username: u.username });
  }
  return out;
}

export interface MentionNotice {
  title: string;
  content?: string | null;
  link: string;
  actorId: string;
}

/** Gửi thông báo "được nhắc tên" cho danh sách đã lọc sẵn. */
export async function notifyMentions(
  targets: MentionTarget[],
  notice: MentionNotice,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  for (const t of targets) {
    await notify({
      userId: t.id,
      type: 'MENTION',
      title: notice.title,
      content: notice.content ?? null,
      link: notice.link,
      actorId: notice.actorId,
    }, tx);
  }
}
