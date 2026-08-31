'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActor } from '@/lib/actor';
import { avgRating } from '@/lib/game';
import { recordGameEvent } from '@/lib/game-stats';
import { grantPoints, InsufficientPointsError } from '@/lib/points';

export interface ToggleFavoriteState {
  active: boolean;
  error?: string;
}

/** Bật/tắt yêu thích một game. */
export async function toggleGameFavorite(gameId: string): Promise<ToggleFavoriteState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { active: false, error: 'Bạn cần đăng nhập.' };

  const existing = await db.favorite.findFirst({ where: { userId, gameId }, select: { id: true } });
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return { active: false };
  }
  await db.favorite.create({ data: { userId, gameId } });
  await recordGameEvent({ gameId, userId, actorKey: `u:${userId}`, type: 'FAVORITE' });
  return { active: true };
}

export interface RateState {
  rating: number;
  ratingCount: number;
  mine: number;
  error?: string;
}

/** Chấm điểm game 1–5 sao; chấm lại thì ghi đè điểm cũ. */
export async function rateGame(gameId: string, score: number): Promise<RateState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { rating: 0, ratingCount: 0, mine: 0, error: 'Bạn cần đăng nhập.' };
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return { rating: 0, ratingCount: 0, mine: 0, error: 'Điểm đánh giá không hợp lệ.' };
  }

  const game = await db.$transaction(async (tx) => {
    const prev = await tx.gameRating.findUnique({ where: { gameId_userId: { gameId, userId } } });
    if (prev) {
      await tx.gameRating.update({ where: { id: prev.id }, data: { score } });
      return tx.game.update({
        where: { id: gameId },
        data: { ratingSum: { increment: score - prev.score } },
        select: { ratingSum: true, ratingCount: true },
      });
    }
    await tx.gameRating.create({ data: { gameId, userId, score } });
    return tx.game.update({
      where: { id: gameId },
      data: { ratingSum: { increment: score }, ratingCount: { increment: 1 } },
      select: { ratingSum: true, ratingCount: true },
    });
  });

  await recordGameEvent({ gameId, userId, actorKey: `u:${userId}`, type: 'RATE', value: score });

  return { rating: avgRating(game.ratingSum, game.ratingCount), ratingCount: game.ratingCount, mine: score };
}

export interface ReportState {
  ok?: boolean;
  error?: string;
}

/** Báo lỗi game (link hỏng, file sai, không chạy…). */
export async function reportGame(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để báo lỗi.' };

  const gameId = String(formData.get('gameId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  const detail = String(formData.get('detail') ?? '').trim();
  if (!gameId || !reason) return { error: 'Hãy chọn lý do báo lỗi.' };

  const recent = await db.report.count({
    where: { reporterId: userId, gameId, createdAt: { gte: new Date(Date.now() - 3600_000) } },
  });
  if (recent >= 3) return { error: 'Bạn đã báo lỗi game này nhiều lần, hãy chờ xử lý.' };

  await db.report.create({
    data: { reporterId: userId, gameId, reason, detail: detail || null },
  });
  return { ok: true };
}

/** Ghi nhận lượt chia sẻ (nút Share trên trang chi tiết). */
export async function recordShare(gameId: string): Promise<void> {
  const actor = await getActor();
  await recordGameEvent({ gameId, userId: actor.userId, actorKey: actor.actorKey, type: 'SHARE' });
}

/** Ghi nhận lượt xem trang chi tiết (gọi từ client sau khi render). */
export async function recordGameView(gameId: string, slug: string): Promise<void> {
  const actor = await getActor();
  const { unique } = await recordGameEvent({ gameId, userId: actor.userId, actorKey: actor.actorKey, type: 'VIEW' });
  if (unique) revalidatePath(`/games/${slug}`);
}

// ─────────────────────── Mở khoá phần tải bằng điểm ───────────────────────

export interface UnlockGameState {
  ok?: boolean;
  error?: string;
}

/**
 * Trả điểm để mở phần tải xuống của một game.
 *
 * Trừ điểm và ghi sổ quyền trong cùng một transaction, và ràng buộc duy nhất
 * (userId, gameId) đảm bảo bấm hai lần cũng chỉ trừ một lần. Điểm về "kho"
 * chứ không sang ví ai — game là hàng của nền tảng, không có tác giả để chia.
 */
export async function unlockGame(gameId: string): Promise<UnlockGameState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để mở khoá.' };

  const game = await db.game.findUnique({
    where: { id: gameId },
    select: { id: true, slug: true, title: true, pricePoints: true, status: true },
  });
  if (!game || game.status !== 'PUBLISHED') return { error: 'Không tìm thấy game.' };

  const price = game.pricePoints ?? 0;
  if (price <= 0) return { ok: true };

  const already = await db.gameUnlock.findUnique({
    where: { userId_gameId: { userId, gameId } },
    select: { id: true },
  });
  if (already) return { ok: true };

  try {
    await db.$transaction(async (tx) => {
      await grantPoints(
        { userId, amount: -price, reason: 'PURCHASE_CONTENT', refId: game.id, note: `Mở khoá tải: ${game.title}` },
        tx,
      );
      await tx.gameUnlock.create({ data: { userId, gameId, pointsPaid: price }, select: { id: true } });
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: 'Bạn không đủ điểm để mở khoá game này.' };
    // Hai tab bấm cùng lúc: ràng buộc duy nhất chặn bản ghi thứ hai, coi như xong.
    const owned = await db.gameUnlock.findUnique({
      where: { userId_gameId: { userId, gameId } }, select: { id: true },
    });
    if (owned) return { ok: true };
    return { error: 'Không mở khoá được, vui lòng thử lại.' };
  }

  revalidatePath(`/games/${game.slug}`);
  return { ok: true };
}

/**
 * Mở khoá một PHIÊN BẢN riêng — độc lập với khoá của cả game.
 *
 * Cùng cấu trúc với `unlockGame`, chỉ đổi bảng: khoá game dùng `GameUnlock`,
 * khoá version dùng `GameVersionUnlock`. Không kiểm lại quyền của cả game ở
 * đây — trang chỉ dựng nút này SAU khi đã qua `checkGameAccess`, và tự bản
 * ghi version cũng không lộ gì nếu gọi thẳng khi chưa mở game.
 */
export async function unlockGameVersion(versionId: string): Promise<UnlockGameState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để mở khoá.' };

  const version = await db.gameVersion.findUnique({
    where: { id: versionId },
    select: {
      id: true, pricePoints: true, version: true,
      game: { select: { id: true, slug: true, title: true, status: true } },
    },
  });
  if (!version || version.game.status !== 'PUBLISHED') return { error: 'Không tìm thấy phiên bản.' };

  const price = version.pricePoints ?? 0;
  if (price <= 0) return { ok: true };

  const already = await db.gameVersionUnlock.findUnique({
    where: { userId_versionId: { userId, versionId } },
    select: { id: true },
  });
  if (already) return { ok: true };

  try {
    await db.$transaction(async (tx) => {
      await grantPoints(
        {
          userId, amount: -price, reason: 'PURCHASE_CONTENT', refId: version.id,
          note: `Mở khoá bản ${version.version}: ${version.game.title}`,
        },
        tx,
      );
      await tx.gameVersionUnlock.create({
        data: { userId, versionId, pointsPaid: price }, select: { id: true },
      });
    });
  } catch (e) {
    if (e instanceof InsufficientPointsError) return { error: 'Bạn không đủ điểm để mở khoá bản này.' };
    const owned = await db.gameVersionUnlock.findUnique({
      where: { userId_versionId: { userId, versionId } }, select: { id: true },
    });
    if (owned) return { ok: true };
    return { error: 'Không mở khoá được, vui lòng thử lại.' };
  }

  revalidatePath(`/games/${version.game.slug}`);
  return { ok: true };
}
