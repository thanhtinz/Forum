import { NextResponse } from 'next/server';
import { isGameSort, parseGameFilter } from '@/lib/game';
import { searchGames } from '@/lib/game-search';

export const dynamic = 'force-dynamic';

/**
 * GET /api/games/search?q=…&sort=…
 *
 * Dùng cho autocomplete và trang tìm kiếm. Khớp trực tiếp trước, thiếu kết quả
 * thì rơi sang fuzzy (bỏ dấu + Levenshtein) nên gõ sai chính tả vẫn ra game.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') ?? '').trim();
  if (!q) return NextResponse.json({ items: [], suggestions: [], fuzzy: false });

  const limit = Math.min(30, Math.max(1, Number(url.searchParams.get('limit') ?? 8) || 8));
  const sortParam = url.searchParams.get('sort') ?? undefined;
  const sort = isGameSort(sortParam) ? sortParam : 'relevance';

  const filter = { ...parseGameFilter(Object.fromEntries(url.searchParams.entries())), q };
  const { items, fuzzy } = await searchGames(filter, { sort, pageSize: limit });

  return NextResponse.json({
    items,
    fuzzy,
    suggestions: items.map((g) => ({ slug: g.slug, title: g.title, titleVi: g.titleVi, icon: g.icon })),
  });
}
