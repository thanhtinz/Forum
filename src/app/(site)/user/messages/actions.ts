'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notify } from '@/lib/notify';
import { getActiveBan, banMessage } from '@/lib/ban';
import { pairKey, otherId, MESSAGE_MAX_LENGTH } from '@/lib/messages';
import { isBlockedBetween, BLOCK_MESSAGE } from '@/lib/block';

export type MessageState = { ok?: boolean; error?: string };

/** Số tin tối đa mỗi giờ — chặn spam tin nhắn hàng loạt. */
const MAX_PER_HOUR = 60;

/**
 * Mở (hoặc tạo) hội thoại với một thành viên rồi chuyển tới đó.
 * Dùng cho nút "Nhắn tin" trên trang cá nhân.
 */
export async function openConversation(formData: FormData) {
  const session = await auth();
  const me = session?.user?.id;
  if (!me) redirect('/login');

  const username = String(formData.get('username') ?? '').trim().replace(/^@/, '');
  const target = await db.user.findFirst({
    where: { username: { equals: username, mode: 'insensitive' } },
    select: { id: true, status: true },
  });
  if (!target || target.id === me || target.status === 'BANNED') redirect('/user/messages');
  if (await isBlockedBetween(me, target.id)) redirect('/user/messages');

  const key = pairKey(me, target.id);
  const convo = await db.conversation.upsert({
    where: { userAId_userBId: key },
    update: {},
    create: key,
    select: { id: true },
  });
  redirect(`/user/messages/${convo.id}`);
}

export async function sendMessage(_prev: MessageState, formData: FormData): Promise<MessageState> {
  const session = await auth();
  const me = session?.user?.id;
  if (!me) return { error: 'Bạn cần đăng nhập.' };

  const conversationId = String(formData.get('conversationId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  if (!conversationId) return { error: 'Thiếu hội thoại.' };
  if (content.length < 1) return { error: 'Hãy nhập nội dung tin nhắn.' };
  if (content.length > MESSAGE_MAX_LENGTH) return { error: `Tin nhắn tối đa ${MESSAGE_MAX_LENGTH} ký tự.` };

  // Cấm bình luận thì cũng không nhắn tin được, nếu không người bị cấm sẽ
  // quay sang spam qua hộp thư.
  const banned = await getActiveBan(me, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'nhắn tin') };

  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userAId: true, userBId: true },
  });
  // Không phải người trong hội thoại thì coi như không tồn tại.
  if (!convo || (convo.userAId !== me && convo.userBId !== me)) return { error: 'Không tìm thấy hội thoại.' };

  const sentLastHour = await db.message.count({
    where: { senderId: me, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (sentLastHour >= MAX_PER_HOUR) {
    return { error: `Bạn đã gửi ${MAX_PER_HOUR} tin nhắn trong một giờ qua. Hãy nghỉ một lát rồi quay lại.` };
  }

  const to = otherId(convo, me);
  if (await isBlockedBetween(me, to)) return { error: BLOCK_MESSAGE };

  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.message.create({ data: { conversationId, senderId: me, content }, select: { id: true } });
    await tx.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: now }, select: { id: true } });
  });

  await notify({
    userId: to, type: 'SYSTEM',
    title: `Tin nhắn mới từ ${session.user.name ?? 'một thành viên'}`,
    content: content.slice(0, 120),
    link: `/user/messages/${conversationId}`,
  }).catch(() => {});

  revalidatePath(`/user/messages/${conversationId}`);
  revalidatePath('/user/messages');
  return { ok: true };
}

/** Đánh dấu đã đọc mọi tin của người kia trong hội thoại. */
export async function markConversationRead(conversationId: string) {
  const session = await auth();
  const me = session?.user?.id;
  if (!me) return;

  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { userAId: true, userBId: true },
  });
  if (!convo || (convo.userAId !== me && convo.userBId !== me)) return;

  await db.message.updateMany({
    where: { conversationId, senderId: { not: me }, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath('/user/messages');
}
