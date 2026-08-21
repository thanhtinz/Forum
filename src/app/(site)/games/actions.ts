'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActor } from '@/lib/actor';
import { avgRating } from '@/lib/game';
import { recordGameEvent } from '@/lib/game-stats';

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
