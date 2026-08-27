import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Award, Clock, Download, Eye, Flame, Gamepad2, Languages, LayoutGrid, Library,
  Inbox, MonitorSmartphone, Shuffle, Sparkles, Trophy,
} from 'lucide-react';
import { db } from '@/lib/db';
import { gameCardSelect, gameTint, toGameCard } from '@/lib/game';
import { fmtCount } from '@/lib/utils';
import { GameRow } from '@/components/game/GameRow';
import { GameSearchBox } from '@/components/game/GameSearchBox';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Game Java ME',
  description: 'Kho game Java ME: tải JAR/JAD về máy thật.',
};

const PUBLISHED = { status: 'PUBLISHED' as const };
const ROW_TAKE = 12;

export default async function GamesHomePage() {
  const [featured, updated, trending, mostViewed, mostDownloaded, vietnamized, genres, platforms, resolutions, collections, totals] =
    await Promise.all([
      db.game.findMany({ where: { ...PUBLISHED, featured: true }, orderBy: { publishedAt: 'desc' }, take: 6, select: gameCardSelect }),
      db.game.findMany({ where: PUBLISHED, orderBy: { updatedAt: 'desc' }, take: ROW_TAKE, select: gameCardSelect }),
      db.game.findMany({ where: PUBLISHED, orderBy: [{ trendingScore: 'desc' }, { viewCount: 'desc' }], take: ROW_TAKE, select: gameCardSelect }),
      db.game.findMany({ where: PUBLISHED, orderBy: { viewCount: 'desc' }, take: ROW_TAKE, select: gameCardSelect }),
      db.game.findMany({ where: PUBLISHED, orderBy: { downloadCount: 'desc' }, take: ROW_TAKE, select: gameCardSelect }),
      db.game.findMany({ where: { ...PUBLISHED, vietnamized: true }, orderBy: { updatedAt: 'desc' }, take: ROW_TAKE, select: gameCardSelect }),
      db.gameGenre.findMany({ take: CONFIG_LIST_CAP, orderBy: { order: 'asc' }, include: { _count: { select: { games: true } } } }),
      db.gamePlatform.findMany({ take: CONFIG_LIST_CAP, orderBy: { order: 'asc' }, include: { _count: { select: { games: true } } } }),
      db.gameResolution.findMany({ take: CONFIG_LIST_CAP, orderBy: [{ order: 'asc' }, { width: 'asc' }], include: { _count: { select: { games: true } } } }),
      db.gameCollection.findMany({ orderBy: [{ featured: 'desc' }, { order: 'asc' }], take: 6, include: { _count: { select: { games: true } } } }),
      db.game.aggregate({ where: PUBLISHED, _count: { _all: true }, _sum: { viewCount: true, downloadCount: true } }),
    ]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 p-6 text-white shadow-card sm:p-8">
        <div className="relative">
          <h1 className="flex items-center gap-2 text-2xl font-black drop-shadow sm:text-3xl">
            <Gamepad2 size={28} /> Game Java ME
          </h1>
          <p className="mt-1 max-w-lg text-white/90 drop-shadow">
Tải JAR/JAD về máy thật, kèm checksum để đối chiếu.
          </p>

          <div className="mt-4 max-w-xl [&_input]:!border-white/30 [&_input]:!bg-white/95 [&_input]:!text-ink-700">
            <GameSearchBox />
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href="/games/browse" className="chip bg-white/20 px-3 py-1.5 backdrop-blur hover:bg-white/30">
              <LayoutGrid size={14} className="mr-1" /> Duyệt kho game
            </Link>
            <Link href="/games/collections" className="chip bg-white/20 px-3 py-1.5 backdrop-blur hover:bg-white/30">
              <Library size={14} className="mr-1" /> Bộ sưu tập
            </Link>
            <Link href="/games/random" prefetch={false} className="chip bg-white/20 px-3 py-1.5 backdrop-blur hover:bg-white/30">
              <Shuffle size={14} className="mr-1" /> Game ngẫu nhiên
            </Link>
            <Link href="/games/yeu-cau" className="chip bg-white/20 px-3 py-1.5 backdrop-blur hover:bg-white/30">
              <Inbox size={14} className="mr-1" /> Yêu cầu game
            </Link>
          </div>

          <div className="mt-4 flex gap-6 text-sm">
            <span className="flex flex-col"><b className="text-xl font-black">{fmtCount(totals._count._all)}</b>game</span>
            <span className="flex flex-col"><b className="text-xl font-black">{fmtCount(totals._sum.viewCount ?? 0)}</b>lượt xem</span>
            <span className="flex flex-col"><b className="text-xl font-black">{fmtCount(totals._sum.downloadCount ?? 0)}</b>lượt tải</span>
          </div>
        </div>
        <Gamepad2 className="pointer-events-none absolute -bottom-8 -right-6 opacity-10" size={190} />
      </section>

      <GameRow title="Game nổi bật" icon={<Sparkles size={18} />} href="/games/browse?sort=popular" games={featured.map(toGameCard)} layout="grid" />
      <GameRow title="Mới cập nhật" icon={<Clock size={18} />} href="/games/browse?sort=updated" games={updated.map(toGameCard)} />
      <GameRow title="Phổ biến" icon={<Flame size={18} />} href="/games/browse?sort=popular" games={trending.map(toGameCard)} />
      <GameRow title="Được xem nhiều" icon={<Eye size={18} />} href="/games/browse?sort=popular" games={mostViewed.map(toGameCard)} />
      <GameRow title="Được tải nhiều" icon={<Download size={18} />} href="/games/browse?sort=downloaded" games={mostDownloaded.map(toGameCard)} />
      <GameRow title="Game Việt hóa" icon={<Languages size={18} />} href="/games/browse?vi=1" games={vietnamized.map(toGameCard)} />

      {/* Thể loại */}
      {genres.length > 0 && (
        <section>
          <h2 className="zib-title mb-3 flex items-center gap-2"><Trophy size={18} /> Theo thể loại</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {genres.map((g) => {
              const tint = g.color ?? gameTint(g.slug);
              return (
                <Link key={g.id} href={`/games/browse?genre=${g.slug}`} className="post-card flex-row items-center gap-3 p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg" style={{ background: `${tint}1f`, color: tint }}>
                    {g.icon ?? <Gamepad2 size={18} />}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-sm">{g.name}</b>
                    <span className="text-[11px] text-ink-400">{fmtCount(g._count.games)} game</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Platform + Resolution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="zib-title mb-3 flex items-center gap-2"><MonitorSmartphone size={18} /> Theo dòng máy</h2>
          <div className="flex flex-wrap gap-2">
            {platforms.map((p) => (
              <Link key={p.id} href={`/games/browse?platform=${p.slug}`}
                className="chip border border-ink-200 px-3 py-1.5 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300">
                {p.name} <span className="ml-1 text-ink-400">{p._count.games}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="zib-title mb-3 flex items-center gap-2"><LayoutGrid size={18} /> Theo độ phân giải</h2>
          <div className="flex flex-wrap gap-2">
            {resolutions.map((r) => (
              <Link key={r.id} href={`/games/browse?resolution=${r.slug}`}
                className="chip border border-ink-200 px-3 py-1.5 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300">
                {r.label} <span className="ml-1 text-ink-400">{r._count.games}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Collections */}
      {collections.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="zib-title flex items-center gap-2"><Award size={18} /> Bộ sưu tập</h2>
            <Link href="/games/collections" className="text-sm text-ink-400 hover:text-brand-600">Xem tất cả</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <Link key={c.id} href={`/games/collections/${c.slug}`} className="post-card p-4">
                <div className="flex items-center gap-2">
                  <Library size={18} className="text-brand-500" />
                  <b className="truncate">{c.name}</b>
                </div>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{c.description}</p>}
                <p className="mt-2 text-[11px] text-ink-400">{c._count.games} game</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
