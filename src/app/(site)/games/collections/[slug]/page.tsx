import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft, Library } from 'lucide-react';
import { db } from '@/lib/db';
import { gameCardSelect, toGameCard } from '@/lib/game';
import { GameGrid } from '@/components/game/GameGrid';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await db.gameCollection.findUnique({ where: { slug }, select: { name: true, description: true } });
  if (!c) return { title: 'Không tìm thấy bộ sưu tập' };
  return { title: c.name, description: c.description ?? undefined };
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = await db.gameCollection.findUnique({
    where: { slug },
    include: {
      games: {
        orderBy: { order: 'asc' },
        include: { game: { select: gameCardSelect } },
      },
    },
  });
  if (!collection) notFound();

  const games = collection.games
    .map((g) => g.game)
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .map(toGameCard);

  return (
    <div className="space-y-5">
      <Link href="/games/collections" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
        <ChevronLeft size={15} /> Tất cả bộ sưu tập
      </Link>

      <header className="card p-5">
        <h1 className="zib-title flex items-center gap-2 text-xl"><Library size={20} /> {collection.name}</h1>
        {collection.description && <p className="mt-2 text-sm text-ink-500">{collection.description}</p>}
        <p className="mt-2 text-xs text-ink-400">{games.length} game</p>
      </header>

      <GameGrid games={games} empty="Bộ sưu tập này chưa có game nào." />
    </div>
  );
}
