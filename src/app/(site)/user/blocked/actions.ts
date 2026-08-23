'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export type BlockState = { blocked: boolean; error?: string };

/**
 * Bật/tắt chặn một thành viên.
 * Chặn thì gỡ luôn quan hệ theo dõi hai chiều — giữ lại thì bảng theo dõi
 * còn tên người vừa chặn, rất khó hiểu.
 */
export async function toggleBlock(targetId: string): Promise<BlockState> {
  const session = await auth();
  const me = session?.user?.id;
  if (!me) return { blocked: false, error: 'Bạn cần đăng nhập.' };
  if (me === targetId) return { blocked: false, error: 'Không thể tự chặn chính mình.' };

  const target = await db.user.findUnique({ where: { id: targetId }, select: { id: true, role: true } });
  if (!target) return { blocked: false, error: 'Không tìm thấy thành viên.' };
  if (target.role === 'ADMIN' || target.role === 'MODERATOR') {
    return { blocked: false, error: 'Không thể chặn quản trị viên.' };
  }

  const existing = await db.block.findUnique({
    where: { blockerId_blockedId: { blockerId: me, blockedId: targetId } },
    select: { id: true },
  });

  if (existing) {
    await db.block.delete({ where: { id: existing.id } });
  } else {
    await db.$transaction(async (tx) => {
      await tx.block.create({ data: { blockerId: me, blockedId: targetId }, select: { id: true } });
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: me, followingId: targetId },
            { followerId: targetId, followingId: me },
          ],
        },
      });
    });
  }

  revalidatePath('/user/blocked');
  revalidatePath('/user/messages');
  return { blocked: !existing };
}
