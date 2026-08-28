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
import { lockUsers } from '@/lib/lock';
import { checkKarmaPermission, KARMA_REASON_MAX, KARMA_REASON_MIN } from '@/lib/karma';

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

// ─────────────────────────── Uy tín ───────────────────────────

export interface KarmaActionState {
  ok?: boolean;
  error?: string;
}

/**
 * Chấm một nấc uy tín cho người khác.
 *
 * `value` chỉ nhận +1 hoặc −1; mọi con số khác coi như hỏng biểu mẫu chứ không
 * làm tròn về 1, vì "chấm 50 điểm một phát" là đúng thứ luật uy tín muốn chặn.
 */
export async function giveKarma(targetId: string, value: number, reason: string): Promise<KarmaActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  // Ai đang bị khoá mồm ở diễn đàn thì cũng không mượn ô lý do để nói tiếp.
  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'chấm uy tín') };

  const nac = value > 0 ? 1 : value < 0 ? -1 : 0;
  if (nac === 0) return { error: 'Chỉ chấm được một nấc cộng hoặc một nấc trừ.' };

  const note = reason.trim().replace(/\s+/g, ' ');
  if (note.length < KARMA_REASON_MIN) return { error: 'Hãy ghi lý do chấm uy tín.' };
  if (note.length > KARMA_REASON_MAX) return { error: `Lý do tối đa ${KARMA_REASON_MAX} ký tự.` };

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, username: true, status: true },
  });
  if (!target || target.status !== 'ACTIVE') return { error: 'Không tìm thấy người này.' };

  if (await isBlockedBetween(userId, targetId)) return { error: BLOCK_MESSAGE };

  const allowed = await checkKarmaPermission(userId, targetId);
  if (!allowed.can) return { error: allowed.reason };

  // Luật uy tín ("một nấc mỗi 24 giờ cho một người, mỗi ngày tối đa N lượt")
  // nằm ở chỗ đọc-rồi-mới-ghi, nên hai lần bấm cùng lúc phá được luật. Khoá
  // hàng người chấm rồi kiểm LẠI bên trong transaction: luồng thứ hai phải chờ,
  // và lúc nó đọc thì phiếu của luồng thứ nhất đã nằm đó.
  const chan = await db.$transaction(async (tx): Promise<string | null> => {
    await lockUsers(tx, userId);
    const lai = await checkKarmaPermission(userId, targetId, tx);
    if (!lai.can) return lai.reason;

    await tx.karmaVote.create({
      data: { fromId: userId, toId: targetId, value: nac, reason: note },
      select: { id: true },
    });
    // Tổng uy tín cộng dồn trên User; cộng trong cùng transaction với hàng vừa
    // ghi để sổ và con số không bao giờ lệch nhau.
    await tx.user.update({
      where: { id: targetId },
      data: { karma: { increment: nac } },
      select: { id: true },
    });
    await notify({
      userId: targetId,
      type: 'KARMA',
      title: nac > 0 ? 'Có người tăng uy tín cho bạn' : 'Có người giảm uy tín của bạn',
      content: note,
      link: `/u/${target.username}/uy-tin`,
      actorId: userId,
    }, tx);
    return null;
  });

  if (chan) return { error: chan };

  revalidatePath(`/u/${target.username}`);
  revalidatePath(`/u/${target.username}/uy-tin`);
  return { ok: true };
}
