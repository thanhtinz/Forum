'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActiveBan, banMessage } from '@/lib/ban';
import { isBlockedBetween, BLOCK_MESSAGE } from '@/lib/block';
import { notify } from '@/lib/notify';
import { resolveMentions, notifyMentions } from '@/lib/mention-notify';
import {
  canRemoveEntry, checkGuestbookRate, isStaff,
  GUESTBOOK_MAX_LEN, GUESTBOOK_REPLY_MAX_LEN,
} from '@/lib/guestbook';

export interface GuestbookState {
  ok?: boolean;
  error?: string;
}

/** Ghi một lời nhắn vào sổ lưu bút của người khác (hoặc của chính mình). */
export async function signGuestbook(_prev: GuestbookState, formData: FormData): Promise<GuestbookState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để ghi sổ lưu bút.' };

  // Dùng chung lệnh cấm với bình luận: ai đang bị khoá mồm ở diễn đàn thì
  // cũng không mượn sổ lưu bút để nói tiếp được.
  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'ghi sổ lưu bút') };

  const username = String(formData.get('username') ?? '').trim();
  const owner = await db.user.findUnique({
    where: { username },
    select: { id: true, username: true, status: true },
  });
  if (!owner || owner.status !== 'ACTIVE') return { error: 'Không tìm thấy người này.' };

  if (await isBlockedBetween(userId, owner.id)) return { error: BLOCK_MESSAGE };

  const tooFast = await checkGuestbookRate(userId, owner.id);
  if (tooFast) return { error: tooFast };

  const content = String(formData.get('content') ?? '').trim();
  if (content.length < 2) return { error: 'Lời nhắn ngắn quá.' };
  if (content.length > GUESTBOOK_MAX_LEN) return { error: `Lời nhắn tối đa ${GUESTBOOK_MAX_LEN} ký tự.` };

  const isPrivate = formData.get('private') === 'on';

  // Lời nhắn kín thì không đi nhắc tên người thứ ba: họ không đọc được nó,
  // báo cho họ chỉ tổ khoe ra là có lời nhắn mà không cho xem.
  const mentioned = isPrivate ? [] : await resolveMentions(content, userId, [owner.id]);

  await db.$transaction(async (tx) => {
    await tx.guestbookEntry.create({
      data: { ownerId: owner.id, authorId: userId, content, private: isPrivate },
      select: { id: true },
    });

    if (owner.id !== userId) {
      await notify({
        userId: owner.id,
        type: 'GUESTBOOK',
        title: 'Có người ghi vào sổ lưu bút của bạn',
        content: content.slice(0, 120),
        link: `/u/${owner.username}#so-luu-but`,
        actorId: userId,
      }, tx);
    }

    await notifyMentions(mentioned, {
      title: 'Có người nhắc tên bạn trong sổ lưu bút',
      content: content.slice(0, 120),
      link: `/u/${owner.username}#so-luu-but`,
      actorId: userId,
    }, tx);
  });

  revalidatePath(`/u/${owner.username}`);
  return { ok: true };
}

/** Chủ nhà hồi âm một lời nhắn trong sổ của mình. */
export async function replyGuestbook(_prev: GuestbookState, formData: FormData): Promise<GuestbookState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const id = String(formData.get('id') ?? '');
  const entry = await db.guestbookEntry.findUnique({
    where: { id },
    select: {
      ownerId: true, authorId: true, hiddenAt: true,
      owner: { select: { username: true } },
    },
  });
  if (!entry) return { error: 'Lời nhắn này không còn.' };
  // Chỉ chủ nhà hồi âm — đây là sổ của họ, không phải chỗ ai cũng chen vào.
  if (entry.ownerId !== userId) return { error: 'Chỉ chủ nhà mới hồi âm được.' };
  if (entry.hiddenAt) return { error: 'Lời nhắn này đã bị gỡ.' };

  const reply = String(formData.get('reply') ?? '').trim();
  if (reply.length > GUESTBOOK_REPLY_MAX_LEN) {
    return { error: `Hồi âm tối đa ${GUESTBOOK_REPLY_MAX_LEN} ký tự.` };
  }

  await db.$transaction(async (tx) => {
    await tx.guestbookEntry.update({
      where: { id },
      // Xoá trắng ô hồi âm là bỏ hồi âm, nên mốc thời gian cũng phải về null.
      data: reply ? { reply, repliedAt: new Date() } : { reply: null, repliedAt: null },
      select: { id: true },
    });

    if (reply && entry.authorId !== userId) {
      await notify({
        userId: entry.authorId,
        type: 'GUESTBOOK',
        title: 'Chủ nhà đã hồi âm lời nhắn của bạn',
        content: reply.slice(0, 120),
        link: `/u/${entry.owner.username}#so-luu-but`,
        actorId: userId,
      }, tx);
    }
  });

  revalidatePath(`/u/${entry.owner.username}`);
  return { ok: true };
}

/**
 * Gỡ một lời nhắn.
 *
 * Gỡ chứ không xoá: hàng vẫn còn để ban điều hành lần ra ai hay đi rải bậy,
 * nhưng người thường không đọc được nữa.
 */
export async function removeGuestbookEntry(id: string): Promise<GuestbookState> {
  const session = await auth();
  const me = session?.user;
  if (!me?.id) return { error: 'Bạn cần đăng nhập.' };

  const entry = await db.guestbookEntry.findUnique({
    where: { id },
    select: { ownerId: true, authorId: true, hiddenAt: true, owner: { select: { username: true } } },
  });
  if (!entry) return { error: 'Lời nhắn này không còn.' };
  if (entry.hiddenAt) return { ok: true };

  const viewer = { id: me.id, role: (me as { role?: string }).role };
  if (!canRemoveEntry(viewer, entry.ownerId, entry.authorId)) {
    return { error: 'Bạn không gỡ được lời nhắn này.' };
  }

  await db.guestbookEntry.update({
    where: { id },
    data: { hiddenAt: new Date(), hiddenById: me.id },
    select: { id: true },
  });

  revalidatePath(`/u/${entry.owner.username}`);
  return { ok: true };
}

/** Ban điều hành phục hồi một lời nhắn đã gỡ nhầm. */
export async function restoreGuestbookEntry(id: string): Promise<GuestbookState> {
  const session = await auth();
  const me = session?.user;
  if (!me?.id) return { error: 'Bạn cần đăng nhập.' };
  if (!isStaff({ id: me.id, role: (me as { role?: string }).role })) {
    return { error: 'Chỉ ban điều hành phục hồi được lời nhắn.' };
  }

  const entry = await db.guestbookEntry.findUnique({
    where: { id },
    select: { owner: { select: { username: true } } },
  });
  if (!entry) return { error: 'Lời nhắn này không còn.' };

  await db.guestbookEntry.update({
    where: { id },
    data: { hiddenAt: null, hiddenById: null },
    select: { id: true },
  });

  revalidatePath(`/u/${entry.owner.username}`);
  return { ok: true };
}
