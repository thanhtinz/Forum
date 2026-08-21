import type { Metadata } from 'next';
import { LayoutGrid } from 'lucide-react';
import { db } from '@/lib/db';
import { isMobileRequest } from '@/lib/device';
import { gameFilterQuery, isGameSort, parseGameFilter } from '@/lib/game';
import { searchGames } from '@/lib/game-search';
import { fmtCount } from '@/lib/utils';
import { GameFilters } from '@/components/game/GameFilters';
import { GameGrid } from '@/components/game/GameGrid';
import { GameSearchBox } from '@/components/game/GameSearchBox';
import { Pagination } from '@/components/Pagination';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 18;

export const metadata: Metadata = {
  title: 'Duyệt kho game',
  description: 'Lọc game Java ME theo thể loại, dòng máy, độ phân giải, năm, dung lượng, lượt chơi và lượt tải.',
};

export default async function BrowseGamesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filter = parseGameFilter(sp);
  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort = isGameSort(sortRaw) ? sortRaw : 'popular';
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page ?? '1') || 1);

  const [result, genres, platforms, resolutions, yearRange, mobile] = await Promise.all([
    searchGames(filter, { sort, page, pageSize: PAGE_SIZE }),
    db.gameGenre.findMany({ orderBy: { order: 'asc' }, select: { slug: true, name: true } }),
    db.gamePlatform.findMany({ orderBy: { order: 'asc' }, select: { slug: true, name: true } }),
    db.gameResolution.findMany({ orderBy: [{ order: 'asc' }, { width: 'asc' }], select: { slug: true, label: true } }),
    db.game.aggregate({ where: { status: 'PUBLISHED' }, _min: { releaseYear: true }, _max: { releaseYear: true } }),
    isMobileRequest(),
  ]);
  const { items: games, total } = result;

  const query = gameFilterQuery(filter, { sort: sort === 'popular' ? undefined : sort });
  const basePath = query ? `/games/browse?${query}` : '/games/browse';

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-20 lg:self-start">
        <GameFilters
          genres={genres}
          platforms={platforms}
          resolutions={resolutions.map((r) => ({ slug: r.slug, name: r.label }))}
          years={{ min: yearRange._min.releaseYear ?? 2000, max: yearRange._max.releaseYear ?? new Date().getFullYear() }}
        />
      </div>

      <div className="min-w-0">
        <header className="card mb-4 p-4">
          <h1 className="zib-title mb-3 flex items-center gap-2"><LayoutGrid size={18} /> Duyệt kho game</h1>
          <GameSearchBox defaultValue={filter.q ?? ''} />
          <p className="mt-3 text-sm text-ink-500">
            <b>{fmtCount(total)}</b> game khớp bộ lọc
            {filter.q && <> cho “<b>{filter.q}</b>”</>}
          </p>
        </header>

        <GameGrid games={games} mobile={mobile} empty="Không có game nào khớp bộ lọc. Thử nới lỏng điều kiện xem sao." />
        <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} basePath={basePath} />
      </div>
    </div>
  );
}
