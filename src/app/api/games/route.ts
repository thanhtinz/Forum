import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { gameCardSelect, gameOrderBy, gameWhere, isGameSort, parseGameFilter, toGameCard } from '@/lib/game';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 50;

/**
 * GET /api/games — catalog game.
 *
 * Hỗ trợ cursor pagination (`?cursor=`) để cuộn vô hạn không bị lệch khi có
 * game mới, và `?page=` cho phân trang cổ điển.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const filter = parseGameFilter(sp);
  const sortParam = url.searchParams.get('sort') ?? undefined;
  const sort = isGameSort(sortParam) ? sortParam : 'popular';
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get('limit') ?? 24) || 24));
  const cursor = url.searchParams.get('cursor');
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);

  const rows = await db.game.findMany({
    where: gameWhere(filter),
    orderBy: [...gameOrderBy(sort), { id: 'asc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : { skip: (page - 1) * limit }),
    select: gameCardSelect,
  });

  const hasMore = rows.length > limit;
  const page1 = rows.slice(0, limit).map(toGameCard);
  // Rating trung bình không phải cột nên phải lọc sau khi lấy dữ liệu.
  const items = filter.minRating != null ? page1.filter((g) => g.rating >= filter.minRating!) : page1;

  return NextResponse.json({
    items,
    nextCursor: hasMore ? rows[limit - 1]!.id : null,
    hasMore,
  });
}
