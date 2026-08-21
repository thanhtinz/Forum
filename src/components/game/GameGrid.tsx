import type { GameCardData } from '@/lib/game';
import { GameCard } from './GameCard';

/** Lưới game responsive dùng cho catalog và trang thể loại. */
export function GameGrid({ games, empty = 'Chưa có game nào.' }: { games: GameCardData[]; empty?: string }) {
  if (games.length === 0) {
    return <div className="card p-10 text-center text-ink-400">{empty}</div>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      {games.map((g) => <GameCard key={g.id} game={g} />)}
    </div>
  );
}
