import { db } from './db';

/** Trần giá một game, chặn tay trượt thêm số 0. */
export const GAME_PRICE_MAX = 100_000;

export interface GameAccess {
  /** Được xem phần tải xuống chưa? */
  allowed: boolean;
  /** Số điểm cần trả; 0 nghĩa là game tải tự do. */
  price: number;
  /** Đã từng trả điểm cho game này. */
  owned: boolean;
}

/**
 * Ai được mở phần tải xuống của một game.
 *
 * Game không đặt giá thì ai cũng tải. Có giá thì phải trả điểm một lần —
 * quản trị viên xem được hết vì họ là người nhập kho.
 */
export async function checkGameAccess(
  userId: string | null,
  game: { id: string; pricePoints: number | null },
  role?: string | null,
): Promise<GameAccess> {
  const price = game.pricePoints ?? 0;
  if (price <= 0) return { allowed: true, price: 0, owned: false };
  if (role === 'ADMIN' || role === 'MODERATOR') return { allowed: true, price, owned: false };
  if (!userId) return { allowed: false, price, owned: false };

  const unlock = await db.gameUnlock.findUnique({
    where: { userId_gameId: { userId, gameId: game.id } },
    select: { id: true },
  });
  return { allowed: !!unlock, price, owned: !!unlock };
}

/**
 * Ai được mở một PHIÊN BẢN cụ thể — độc lập với khoá của cả game.
 *
 * Đây là lớp khoá THỨ HAI: một game có thể tải tự do mà vẫn có một bản nâng
 * cấp thu điểm riêng, vì mỗi loại file có version riêng và admin định giá
 * riêng cho từng cái. Không mở game thì đương nhiên không mở được version bên
 * trong, nên phải qua `checkGameAccess` trước — hàm này không tự kiểm lại.
 */
export async function checkVersionAccess(
  userId: string | null,
  version: { id: string; pricePoints: number | null },
  role?: string | null,
): Promise<GameAccess> {
  const price = version.pricePoints ?? 0;
  if (price <= 0) return { allowed: true, price: 0, owned: false };
  if (role === 'ADMIN' || role === 'MODERATOR') return { allowed: true, price, owned: false };
  if (!userId) return { allowed: false, price, owned: false };

  const unlock = await db.gameVersionUnlock.findUnique({
    where: { userId_versionId: { userId, versionId: version.id } },
    select: { id: true },
  });
  return { allowed: !!unlock, price, owned: !!unlock };
}
