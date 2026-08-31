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

  // Rating trung bình không phải một cột nên Prisma không lọc được. Lọc thì
  // phải lọc TRƯỚC khi cắt trang: cắt trước rồi lọc sau là trang trả về ngắn
  // hơn `limit`, thậm chí rỗng, trong khi `hasMore` vẫn báo còn — cuộn vô hạn
  // thấy trang trống là dừng, dù phía sau vẫn còn game hợp điều kiện.
  const locSao = filter.minRating != null;
  // Lấy dư khi có lọc sao, để sau khi bỏ bớt vẫn đủ một trang.
  const lay = locSao ? Math.min(MAX_LIMIT * 8, (limit + 1) * 8) : limit + 1;

  const rows = await db.game.findMany({
    where: gameWhere(filter),
    orderBy: [...gameOrderBy(sort), { id: 'asc' }],
    take: lay,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : { skip: (page - 1) * limit }),
    select: gameCardSelect,
  });

  const hop = locSao
    ? rows.map(toGameCard).filter((g) => g.rating >= filter.minRating!)
    : rows.map(toGameCard);
  const hasMore = hop.length > limit;
  const items = hop.slice(0, limit);

  return NextResponse.json({
    items,
    // Con trỏ phải là dòng CUỐI CÙNG được trả về, không phải dòng thứ `limit`
    // của tập chưa lọc — lấy nhầm thì lượt sau nhảy cóc qua mấy game.
    nextCursor: hasMore && items.length > 0 ? items[items.length - 1]!.id : null,
    hasMore,
  });
}
