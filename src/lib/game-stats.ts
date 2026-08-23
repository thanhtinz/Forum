import { createHash } from 'node:crypto';
import type { GameEventType, Prisma } from '@prisma/client';
import { db } from '@/lib/db';

/**
 * Ghi nhận sự kiện game + thống kê.
 *
 * Mỗi sự kiện được lưu thô vào `GameEvent` (phục vụ analytics), đồng thời cập
 * nhật bộ đếm tổng trên `Game`. Bộ đếm "unique" chỉ tăng lần đầu tiên với một
 * actor — nhờ khoá duy nhất trên `GameUniqueHit`, nên tải lặp bất thường không
 * làm phồng unique download.
 */

/** Khoá định danh actor: user id nếu đăng nhập, ngược lại hash(ip + user-agent). */
export function actorKeyOf(userId: string | null | undefined, ip?: string | null, ua?: string | null): string {
  if (userId) return `u:${userId}`;
  const h = createHash('sha256').update(`${ip ?? 'unknown'}|${ua ?? ''}`).digest('hex').slice(0, 32);
  return `g:${h}`;
}

/** Lấy IP thật phía sau proxy/CDN. */
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return headers.get('x-real-ip');
}

export interface RecordEventInput {
  gameId: string;
  versionId?: string | null;
  userId?: string | null;
  actorKey: string;
  type: GameEventType;
  value?: number | null;
  meta?: Prisma.InputJsonValue;
}

/** Các loại sự kiện có khái niệm "unique". */
const UNIQUE_TYPES: GameEventType[] = ['VIEW', 'DOWNLOAD'];

/** Cột tổng / cột unique tương ứng cho từng loại sự kiện. */
const COUNTER: Partial<Record<GameEventType, { total: keyof Prisma.GameUpdateInput; unique: keyof Prisma.GameUpdateInput }>> = {
  VIEW: { total: 'viewCount', unique: 'uniqueViewCount' },
  DOWNLOAD: { total: 'downloadCount', unique: 'uniqueDownloadCount' },
};

/**
 * Ghi một sự kiện và cập nhật bộ đếm. Không ném lỗi ra ngoài: thống kê hỏng
 * không được làm hỏng luồng chính (xem trang / tải file).
 */
export async function recordGameEvent(input: RecordEventInput): Promise<{ unique: boolean }> {
  try {
    let unique = false;
    if (UNIQUE_TYPES.includes(input.type)) {
      try {
        await db.gameUniqueHit.create({
          data: { gameId: input.gameId, type: input.type, actorKey: input.actorKey },
        });
        unique = true;
      } catch {
        // đã tồn tại → không phải lượt unique
      }
    }

    await db.gameEvent.create({
      data: {
        gameId: input.gameId,
        versionId: input.versionId ?? null,
        userId: input.userId ?? null,
        actorKey: input.actorKey,
        type: input.type,
        isUnique: unique,
        value: input.value ?? null,
        meta: input.meta,
      },
    });

    const counter = COUNTER[input.type];
    if (counter) {
      const data: Prisma.GameUpdateInput = { [counter.total]: { increment: 1 } } as Prisma.GameUpdateInput;
      if (unique) Object.assign(data, { [counter.unique]: { increment: 1 } });
      await db.game.update({ where: { id: input.gameId }, data });
    }
    return { unique };
  } catch {
    return { unique: false };
  }
}

/**
 * Trending score: hoạt động 7 ngày gần nhất có trọng số, giảm dần theo tuổi bài.
 * Chạy định kỳ (cron/queue) hoặc gọi thủ công từ trang admin.
 */
export async function recomputeTrending(days = 7): Promise<number> {
  const since = new Date(Date.now() - days * 86400_000);
  const rows = await db.gameEvent.groupBy({
    by: ['gameId', 'type'],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  const weight: Partial<Record<GameEventType, number>> = {
    VIEW: 1,
    DOWNLOAD: 4,
    FAVORITE: 3,
    SHARE: 2,
    RATE: 2,
  };

  const score = new Map<string, number>();
  for (const r of rows) {
    score.set(r.gameId, (score.get(r.gameId) ?? 0) + (weight[r.type] ?? 0) * r._count._all);
  }

  const games = await db.game.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, publishedAt: true },
  });

  await db.$transaction(
    games.map((g) => {
      const raw = score.get(g.id) ?? 0;
      const ageDays = g.publishedAt ? (Date.now() - g.publishedAt.getTime()) / 86400_000 : 365;
      // Giảm dần kiểu Hacker News: score / (age + 2)^0.4
      const value = Math.round((raw / Math.pow(ageDays + 2, 0.4)) * 100) / 100;
      return db.game.update({ where: { id: g.id }, data: { trendingScore: value } });
    }),
  );
  return games.length;
}

export interface GameAnalytics {
  views: number;
  uniqueViews: number;
  downloads: number;
  uniqueDownloads: number;
  /** Tỉ lệ người xem rồi tải file về (view → download). */
  viewToDownload: number;
}

/** Chỉ số tổng hợp cho trang chi tiết / admin. */
export async function gameAnalytics(gameId: string): Promise<GameAnalytics> {
  const game = await db.game.findUnique({
    where: { id: gameId },
    select: {
      viewCount: true, uniqueViewCount: true,
      downloadCount: true, uniqueDownloadCount: true,
    },
  });

  const g = game ?? { viewCount: 0, uniqueViewCount: 0, downloadCount: 0, uniqueDownloadCount: 0 };
  return {
    views: g.viewCount,
    uniqueViews: g.uniqueViewCount,
    downloads: g.downloadCount,
    uniqueDownloads: g.uniqueDownloadCount,
    viewToDownload: g.uniqueViewCount > 0 ? Math.round((g.uniqueDownloadCount / g.uniqueViewCount) * 100) : 0,
  };
}
