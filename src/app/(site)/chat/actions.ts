'use server';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActiveBan, banMessage } from '@/lib/ban';
import { resolveMentions, notifyMentions } from '@/lib/mention-notify';
import { markHere, canRemoveShout, checkShoutRate, SHOUT_MAX_LEN, SHOUT_SCOPE, SHOUT_KEEP_DAYS } from '@/lib/shout';

export interface ShoutState {
  ok?: boolean;
  error?: string;
}

/**
 * Nói một câu trong phòng chat chung.
 *
 * Dùng chung lệnh cấm với bình luận: ai đang bị cấm nói ở diễn đàn thì cũng
 * không mượn phòng chat để nói tiếp được.
 */
export async function sendShout(_prev: ShoutState, formData: FormData): Promise<ShoutState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để vào phòng chat.' };

  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'chat') };

  const tooFast = await checkShoutRate(userId);
  if (tooFast) return { error: tooFast };

  const content = String(formData.get('content') ?? '').trim();
  if (content.length < 1) return { error: 'Chưa nhập gì cả.' };
  if (content.length > SHOUT_MAX_LEN) return { error: `Mỗi câu tối đa ${SHOUT_MAX_LEN} ký tự.` };

  // Chỉ nhận câu trả lời trỏ vào một câu có thật trong phòng.
  const replyToRaw = String(formData.get('replyToId') ?? '').trim();
  let replyToId: string | null = null;
  if (replyToRaw) {
    const target = await db.shoutMessage.findUnique({ where: { id: replyToRaw }, select: { id: true } });
    replyToId = target?.id ?? null;
  }

  const mentioned = await resolveMentions(content, userId, []);

  await db.$transaction(async (tx) => {
    await tx.shoutMessage.create({ data: { userId, content, replyToId }, select: { id: true } });
    await notifyMentions(
      mentioned,
      { title: 'Có người nhắc tên bạn trong phòng chat', content: content.slice(0, 120), link: '/chat', actorId: userId },
      tx,
    );
  });

  await markHere(userId, SHOUT_SCOPE);

  // Phòng chat là chỗ nói rồi trôi, không phải kho lưu trữ: dọn các câu đã cũ
  // để bảng không phình vô hạn. Lỗi ở bước dọn không ảnh hưởng câu vừa gửi.
  await db.shoutMessage
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - SHOUT_KEEP_DAYS * 86400_000) } } })
    .catch(() => {});

  return { ok: true };
}

/** Gỡ một câu: chính chủ gỡ câu mình, điều hành gỡ được của người khác. */
export async function removeShout(id: string): Promise<ShoutState> {
  const session = await auth();
  const me = session?.user;
  if (!me?.id) return { error: 'Bạn cần đăng nhập.' };

  const row = await db.shoutMessage.findUnique({ where: { id }, select: { userId: true, deletedAt: true } });
  if (!row) return { error: 'Câu này không còn.' };
  if (row.deletedAt) return { ok: true };

  const role = (me as { role?: string }).role;
  if (!canRemoveShout({ id: me.id, role }, row.userId)) return { error: 'Bạn không gỡ được câu của người khác.' };

  await db.shoutMessage.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: me.id },
    select: { id: true },
  });
  return { ok: true };
}
