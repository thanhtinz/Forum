import type { MiniGame } from '@prisma/client';
import { db } from './db';
import { VAN_MOI_NGAY } from './mini-game-const';

export * from './mini-game-const';

/** Mốc 00:00 hôm nay theo giờ Việt Nam, quy về UTC để so trong truy vấn. */
export function dauNgayVN(now = new Date()): Date {
  const ngay = new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return new Date(Date.parse(`${ngay}T00:00:00Z`) - 7 * 3600 * 1000);
}

/** Số ván đã chơi hôm nay của một trò. */
export async function vanHomNay(userId: string, game: MiniGame): Promise<number> {
  return db.miniGamePlay.count({
    where: { userId, game, createdAt: { gte: dauNgayVN() } },
  });
}

/** Số ván còn lại hôm nay. */
export async function conLai(userId: string, game: MiniGame): Promise<number> {
  return Math.max(0, VAN_MOI_NGAY - (await vanHomNay(userId, game)));
}
