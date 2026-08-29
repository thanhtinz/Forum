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

export interface LuotChoi {
  id: string;
  game: MiniGame;
  bet: number;
  delta: number;
  detail: string | null;
  createdAt: Date;
  user: { username: string | null; name: string | null };
}

/**
 * Vài lượt chơi gần nhất của cả nhà, để in bảng "vừa có người…".
 *
 * Bản wap ngày trước hay có một dòng chạy kiểu "Ai đó vừa ăn 3 con nai" — nó
 * làm khu giải trí có hơi người, chứ trang trống trơn thì chơi một mình chán.
 */
export async function luotGanDay(take = 10): Promise<LuotChoi[]> {
  return db.miniGamePlay.findMany({
    where: { bet: { gt: 0 } },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true, game: true, bet: true, delta: true, detail: true, createdAt: true,
      user: { select: { username: true, name: true } },
    },
  });
}
