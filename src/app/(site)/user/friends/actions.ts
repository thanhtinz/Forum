'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isBlockedBetween, BLOCK_MESSAGE } from '@/lib/block';
import { notify } from '@/lib/notify';
import { findFriendship, FRIEND_MESSAGE_MAX, FRIEND_PENDING_MAX } from '@/lib/friend';

export interface FriendActionState {
  ok?: boolean;
  error?: string;
}

/** Làm mới cả trang bạn bè lẫn trang cá nhân của người kia. */
function refresh(username?: string | null) {
  revalidatePath('/user/friends');
  if (username) revalidatePath(`/u/${username}`);
}

/** Gửi lời mời kết bạn. */
export async function sendFriendRequest(targetId: string, message?: string): Promise<FriendActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };
  if (userId === targetId) return { error: 'Không tự kết bạn với mình được.' };

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, username: true, status: true },
  });
  if (!target || target.status !== 'ACTIVE') return { error: 'Không tìm thấy người này.' };

  if (await isBlockedBetween(userId, targetId)) return { error: BLOCK_MESSAGE };

  const note = (message ?? '').trim().slice(0, FRIEND_MESSAGE_MAX);

  const existing = await findFriendship(userId, targetId);
  if (existing) {
    if (existing.status === 'ACCEPTED') return { error: 'Hai bạn đã là bạn bè rồi.' };
    // Người kia đã mời mình từ trước: bấm "kết bạn" lúc này rõ ràng là đồng ý,
    // bắt họ đi tìm nút Đồng ý ở chỗ khác thì vô lý.
    if (existing.addresseeId === userId) return acceptFriendRequest(existing.id);
    return { error: 'Bạn đã gửi lời mời, đang chờ người kia đồng ý.' };
  }

  const pending = await db.friendship.count({ where: { requesterId: userId, status: 'PENDING' } });
  if (pending >= FRIEND_PENDING_MAX) {
    return { error: `Bạn đang có ${FRIEND_PENDING_MAX} lời mời chờ trả lời, dọn bớt đã nhé.` };
  }

  await db.$transaction(async (tx) => {
    await tx.friendship.create({
      data: { requesterId: userId, addresseeId: targetId, message: note || null },
      select: { id: true },
    });
    await notify({
      userId: targetId,
      type: 'FRIEND',
      title: 'Có người muốn kết bạn với bạn',
      content: note || null,
      link: '/user/friends',
      actorId: userId,
    }, tx);
  });

  refresh(target.username);
  return { ok: true };
}

/** Đồng ý một lời mời gửi cho mình. */
export async function acceptFriendRequest(id: string): Promise<FriendActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const row = await db.friendship.findUnique({
    where: { id },
    select: {
      requesterId: true, addresseeId: true, status: true,
      requester: { select: { username: true } },
    },
  });
  if (!row) return { error: 'Lời mời này không còn.' };
  if (row.status === 'ACCEPTED') return { ok: true };
  // Chỉ người NHẬN mới đồng ý được, nếu không người gửi tự bấm là tự kết bạn.
  if (row.addresseeId !== userId) return { error: 'Lời mời này không gửi cho bạn.' };

  if (await isBlockedBetween(userId, row.requesterId)) return { error: BLOCK_MESSAGE };

  await db.$transaction(async (tx) => {
    await tx.friendship.update({
      where: { id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
      select: { id: true },
    });
    await notify({
      userId: row.requesterId,
      type: 'FRIEND',
      title: 'Lời mời kết bạn của bạn đã được đồng ý',
      link: '/user/friends',
      actorId: userId,
    }, tx);
  });

  refresh(row.requester.username);
  return { ok: true };
}

/**
 * Bỏ một quan hệ: từ chối lời mời, rút lời mời đã gửi, hoặc huỷ kết bạn.
 *
 * Ba việc này cùng là "xoá hàng nối hai người", chỉ khác nhau ở chữ trên nút,
 * nên gộp lại một hàm thay vì ba hàm giống hệt nhau.
 */
export async function removeFriendship(id: string): Promise<FriendActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const row = await db.friendship.findUnique({
    where: { id },
    select: {
      requesterId: true, addresseeId: true,
      requester: { select: { username: true } },
      addressee: { select: { username: true } },
    },
  });
  if (!row) return { ok: true };
  if (row.requesterId !== userId && row.addresseeId !== userId) {
    return { error: 'Đây không phải quan hệ của bạn.' };
  }

  await db.friendship.delete({ where: { id } });

  refresh(row.requesterId === userId ? row.addressee.username : row.requester.username);
  return { ok: true };
}

/** Huỷ kết bạn / rút lời mời khi chỉ biết người kia là ai (dùng từ trang cá nhân). */
export async function removeFriendshipWith(targetId: string): Promise<FriendActionState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const row = await findFriendship(userId, targetId);
  if (!row) return { ok: true };
  return removeFriendship(row.id);
}
