import type { Metadata } from 'next';
import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';
import { isMobileRequest } from '@/lib/device';
import { GAME_SORTS, isGameSort, parseGameFilter, type GameCardData } from '@/lib/game';
import { searchGames } from '@/lib/game-search';
import { cn, fmtCount } from '@/lib/utils';
import { GameCard } from '@/components/game/GameCard';
import { GameSearchBox } from '@/components/game/GameSearchBox';
import { Pagination } from '@/components/Pagination';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 15;

export const metadata: Metadata = { title: 'Tìm game' };

export default async function GameSearchPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filter = parseGameFilter(sp);
  const q = filter.q ?? '';
  const sortRaw = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort = isGameSort(sortRaw) ? sortRaw : 'relevance';
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page ?? '1') || 1);

  const mobile = await isMobileRequest();
  let games: GameCardData[] = [];
  let total = 0;
  let fuzzy = false;

  if (q) {
    const result = await searchGames(filter, { sort, page, pageSize: PAGE_SIZE });
    games = result.items;
    total = result.total;
    fuzzy = result.fuzzy;
  }

  const linkFor = (s: string) => `/games/search?q=${encodeURIComponent(q)}${s === 'relevance' ? '' : `&sort=${s}`}`;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="card mb-5 p-5">
        <h1 className="zib-title mb-3 flex items-center gap-2"><SearchIcon size={18} /> Tìm game</h1>
        <GameSearchBox defaultValue={q} autoFocus />
        {q && (
          <>
            <p className="mt-3 text-sm text-ink-500">
              Tìm thấy <b>{fmtCount(total)}</b> game cho “<b>{q}</b>”
              {fuzzy && <span className="text-ink-400"> — không có kết quả khớp chính xác, đây là những game gần giống nhất.</span>}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(GAME_SORTS).map(([k, label]) => (
                <Link
                  key={k}
                  href={linkFor(k)}
                  className={cn('chip border', sort === k
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300')}
                >
                  {label}
                </Link>
              ))}
            </div>
          </>
        )}
      </header>

      {!q ? (
        <div className="card p-12 text-center text-ink-400">
          Nhập tên game, nhà phát triển, series hoặc tag để tìm.
        </div>
      ) : games.length === 0 ? (
        <div className="card p-12 text-center text-ink-400">
          Không tìm thấy game nào cho “{q}”.
          <br />
          <Link href="/games/browse" className="mt-2 inline-block text-brand-600">Thử duyệt kho game theo bộ lọc</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((g) => <GameCard key={g.id} game={g} variant="list" mobile={mobile} />)}
        </div>
      )}

      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} basePath={linkFor(sort)} />
    </div>
  );
}
