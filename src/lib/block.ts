import { db } from './db';

/**
 * Có chặn giữa hai người hay không — xét cả hai chiều.
 *
 * Chỉ chặn một chiều thì người bị chặn vẫn nhắn ngược lại được, nên mọi
 * nơi kiểm quyền đều dùng hàm này thay vì tra riêng một hướng.
 */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const hit = await db.block.findFirst({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
    select: { id: true },
  });
  return !!hit;
}

/** Mình có đang chặn người kia không (để hiện đúng nhãn nút). */
export async function hasBlocked(me: string, target: string): Promise<boolean> {
  if (me === target) return false;
  const hit = await db.block.findUnique({
    where: { blockerId_blockedId: { blockerId: me, blockedId: target } },
    select: { id: true },
  });
  return !!hit;
}

export const BLOCK_MESSAGE = 'Không thể thực hiện: một trong hai người đã chặn người kia.';
