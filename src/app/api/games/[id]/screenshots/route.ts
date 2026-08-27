import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assetUrl } from '@/lib/game-files';
import { ITEM_LIST_CAP } from '@/lib/list-cap';

export const dynamic = 'force-dynamic';

/** GET /api/games/{id|slug}/screenshots — gallery. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await db.game.findFirst({
    where: { OR: [{ id }, { slug: id }], status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!game) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const images = await db.gameImage.findMany({ take: ITEM_LIST_CAP,
    where: { gameId: game.id, type: 'SCREENSHOT' },
    orderBy: { sortOrder: 'asc' },
  });

  return NextResponse.json({
    items: images.map((i) => ({
      id: i.id,
      url: assetUrl(i.storageKey),
      caption: i.caption,
      width: i.width,
      height: i.height,
    })),
  });
}
