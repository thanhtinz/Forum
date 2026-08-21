import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { GameCardData } from '@/lib/game';
import { GameCard } from './GameCard';

export interface GameRowProps {
  title: string;
  icon?: React.ReactNode;
  href?: string;
  games: GameCardData[];
  /** Hàng cuộn ngang (mặc định) hay lưới 3 cột. */
  layout?: 'scroll' | 'grid';
}

/** Một mục trên trang chủ Game: tiêu đề + link "xem tất cả" + danh sách game. */
export function GameRow({ title, icon, href, games, layout = 'scroll' }: GameRowProps) {
  if (games.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="zib-title flex items-center gap-2">{icon}{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-0.5 text-sm text-ink-400 hover:text-brand-600">
            Xem tất cả <ChevronRight size={15} />
          </Link>
        )}
      </div>

      {layout === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {games.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      ) : (
        <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
          {games.map((g) => <GameCard key={g.id} game={g} variant="compact" />)}
        </div>
      )}
    </section>
  );
}
