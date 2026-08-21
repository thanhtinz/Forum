import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /games/random — nhảy tới một game đã đăng bất kỳ. */
export async function GET(req: Request) {
  const total = await db.game.count({ where: { status: 'PUBLISHED' } });
  if (total === 0) return NextResponse.redirect(new URL('/games', req.url));

  const skip = Math.floor(Math.random() * total);
  const game = await db.game.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { id: 'asc' },
    skip,
    select: { slug: true },
  });

  return NextResponse.redirect(new URL(game ? `/games/${game.slug}` : '/games', req.url));
}
