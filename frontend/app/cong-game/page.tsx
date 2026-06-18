'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Gamepad2, Star, Play, ChevronRight } from 'lucide-react';
import { gamePortal, GameItem } from '@/lib/gamePortal';

function GameIcon({ g, size = 'md' }: { g: GameItem; size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'h-24 w-24 text-3xl' : 'h-14 w-14 text-lg';
  if (g.iconUrl) return <img src={g.iconUrl} alt={g.name} className={`${cls} shrink-0 rounded-2xl object-cover`} />;
  const initials = g.name.split(' ').slice(0, 2).map((w) => w[0]).join('');
  return (
    <div className={`${cls} grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-fuchsia-700 font-bold text-white`}>{initials}</div>
  );
}

function Stars({ n = 0 }: { n?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} className={i <= n ? 'fill-amber-400 text-amber-400' : 'text-ink-300 dark:text-ink-600'} />)}
    </div>
  );
}

export default function CongGamePage() {
  const [games, setGames] = useState<GameItem[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => { gamePortal.listGames().then(setGames).catch((e) => setErr(e.message)); }, []);

  const featured = games.filter((g) => g.featured);
  const online = games.filter((g) => g.online);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-700 via-brand-700 to-fuchsia-700 p-6 text-white shadow-card">
        <Gamepad2 size={28} />
        <div>
          <h1 className="text-2xl font-bold">Cổng game</h1>
          <p className="text-sm text-white/80">Chơi ngay, nhận giftcode & mua vật phẩm bằng Gem</p>
        </div>
      </header>

      {err && <p className="text-sm text-rose-500">{err}</p>}

      {/* Có thể bạn quan tâm */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Có thể bạn quan tâm</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {featured.map((g) => (
            <Link key={g.slug} href={`/cong-game/${g.slug}`} className="card group w-36 shrink-0 p-3 text-center transition hover:-translate-y-0.5 hover:shadow-lg">
              <GameIcon g={g} size="lg" />
              <p className="mt-2 truncate text-sm font-semibold">{g.name}</p>
              <p className="truncate text-xs text-ink-400">{g.genre}</p>
            </Link>
          ))}
          {featured.length === 0 && <p className="text-sm text-ink-400">Chưa có game nổi bật.</p>}
        </div>
      </section>

      {/* Trò chơi trực tuyến */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Trò chơi trực tuyến</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {online.map((g) => (
            <div key={g.slug} className="card flex items-center gap-3 p-3">
              <Link href={`/cong-game/${g.slug}`}><GameIcon g={g} /></Link>
              <div className="min-w-0 flex-1">
                <Link href={`/cong-game/${g.slug}`} className="block truncate font-semibold hover:text-brand-600">{g.name}</Link>
                <p className="text-xs text-ink-400">Thể loại: {g.genre}</p>
                {g.shortDesc && <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{g.shortDesc}</p>}
              </div>
              <Link href={`/cong-game/${g.slug}`} className="btn-primary shrink-0 !px-3 !py-1.5 text-xs"><Play size={14} /> Chơi ngay</Link>
            </div>
          ))}
          {online.length === 0 && <p className="text-sm text-ink-400">Chưa có game.</p>}
        </div>
      </section>

      {/* Tất cả game */}
      <section>
        <h2 className="mb-3 text-lg font-bold">Tất cả game</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {games.map((g) => (
            <Link key={g.slug} href={`/cong-game/${g.slug}`} className="card flex items-center gap-3 p-3 transition hover:shadow-lg">
              <GameIcon g={g} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{g.name}</p>
                <Stars n={g.rating} />
                <p className="mt-0.5 flex items-center text-xs text-brand-500">Chi tiết <ChevronRight size={12} /></p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
