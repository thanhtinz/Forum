'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notify } from '@/lib/notify';
import { getActiveBan, banMessage } from '@/lib/ban';
import { pairKey, otherId, MESSAGE_MAX_LENGTH } from '@/lib/messages';
import { isBlockedBetween, BLOCK_MESSAGE } from '@/lib/block';
import {
  CHAT_THEMES, CHAT_BUBBLES, MESSAGE_REACTIONS, AUTO_DELETE_OPTIONS, NICKNAME_MAX,
} from '@/lib/chat-theme';

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

// ─────────────── Tuỳ chỉnh hội thoại ───────────────

/** Lấy hội thoại và kiểm người gọi có ở trong đó không. */
async function myConversation(me: string, conversationId: string) {
  const convo = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userAId: true, userBId: true },
  });
  if (!convo || (convo.userAId !== me && convo.userBId !== me)) return null;
  return convo;
}

export type ChatPrefState = { ok?: boolean; error?: string };

/** Đổi ảnh nền / kiểu bong bóng — áp dụng cho cả hai người như các app chat. */
export async function setChatAppearance(conversationId: string, theme: string, bubble: string): Promise<ChatPrefState> {
  const session = await auth();
  const me = session?.user?.id;
  if (!me) return { error: 'Bạn cần đăng nhập.' };

  const convo = await myConversation(me, conversationId);
  if (!convo) return { error: 'Không tìm thấy hội thoại.' };
  if (!CHAT_THEMES.some((t) => t.value === theme)) return { error: 'Ảnh nền không hợp lệ.' };
  if (!CHAT_BUBBLES.some((b) => b.value === bubble)) return { error: 'Kiểu bong bóng không hợp lệ.' };

  await db.conversation.update({ where: { id: conversationId }, data: { theme, bubble }, select: { id: true } });
  revalidatePath(`/user/messages/${conversationId}`);
  return { ok: true };
}

/** Đặt biệt danh cho một người trong hội thoại; để trống là gỡ biệt danh. */
export async function setNickname(conversationId: string, targetId: string, nickname: string): Promise<ChatPrefState> {
  const session = await auth();
  const me = session?.user?.id;
  if (!me) return { error: 'Bạn cần đăng nhập.' };

  const convo = await myConversation(me, conversationId);
  if (!convo) return { error: 'Không tìm thấy hội thoại.' };
  if (targetId !== convo.userAId && targetId !== convo.userBId) return { error: 'Người này không ở trong hội thoại.' };

  const value = nickname.trim().slice(0, NICKNAME_MAX) || null;
  // Cột nào tuỳ theo target là userA hay userB.
  const data = targetId === convo.userAId ? { nicknameA: value } : { nicknameB: value };
  await db.conversation.update({ where: { id: conversationId }, data, select: { id: true } });
  revalidatePath(`/user/messages/${conversationId}`);
  revalidatePath('/user/messages');
  return { ok: true };
}

/** Bật/tắt tự xoá tin. Bật xong dọn luôn tin đã quá hạn cho khỏi phải chờ. */
export async function setAutoDelete(conversationId: string, hours: number): Promise<ChatPrefState> {
  const session = await auth();
  const me = session?.user?.id;
  if (!me) return { error: 'Bạn cần đăng nhập.' };

  const convo = await myConversation(me, conversationId);
  if (!convo) return { error: 'Không tìm thấy hội thoại.' };
  if (!AUTO_DELETE_OPTIONS.some((o) => o.hours === hours)) return { error: 'Mốc thời gian không hợp lệ.' };

  await db.conversation.update({
    where: { id: conversationId },
    data: { autoDeleteHours: hours > 0 ? hours : null },
    select: { id: true },
  });
  if (hours > 0) await purgeExpiredMessages(conversationId, hours);

  revalidatePath(`/user/messages/${conversationId}`);
  return { ok: true };
}

/**
 * Xoá tin đã quá hạn của một hội thoại.
 *
 * Dọn ngay lúc mở hội thoại thay vì chạy nền: không có hàng đợi nền nào ở
 * đây, mà tin quá hạn thì không được hiện ra nữa — dọn tại chỗ là chắc chắn nhất.
 */
export async function purgeExpiredMessages(conversationId: string, hours: number) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  await db.message.deleteMany({ where: { conversationId, createdAt: { lt: cutoff } } });
}

// ─────────────── Cảm xúc trên tin nhắn ───────────────

export type ReactState = { emoji?: string | null; error?: string };

/**
 * Thả / đổi / gỡ cảm xúc. Thả lại đúng cảm xúc đang có thì gỡ,
 * nhờ vậy bấm đúp lần hai là bỏ tim.
 */
export async function reactToMessage(messageId: string, emoji: string): Promise<ReactState> {
  const session = await auth();
  const me = session?.user?.id;
  if (!me) return { error: 'Bạn cần đăng nhập.' };
  if (!(MESSAGE_REACTIONS as readonly string[]).includes(emoji)) return { error: 'Cảm xúc không hợp lệ.' };

  const msg = await db.message.findUnique({
    where: { id: messageId },
    select: { id: true, conversation: { select: { userAId: true, userBId: true } } },
  });
  if (!msg || (msg.conversation.userAId !== me && msg.conversation.userBId !== me)) {
    return { error: 'Không tìm thấy tin nhắn.' };
  }

  const existing = await db.messageReaction.findUnique({
    where: { messageId_userId: { messageId, userId: me } },
    select: { id: true, emoji: true },
  });

  if (existing?.emoji === emoji) {
    await db.messageReaction.delete({ where: { id: existing.id } });
    return { emoji: null };
  }
  await db.messageReaction.upsert({
    where: { messageId_userId: { messageId, userId: me } },
    update: { emoji },
    create: { messageId, userId: me, emoji },
    select: { id: true },
  });
  return { emoji };
}
