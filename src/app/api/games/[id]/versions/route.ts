import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/games/{id|slug}/versions — danh sách version + file. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await db.game.findFirst({
    where: { OR: [{ id }, { slug: id }], status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!game) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const versions = await db.gameVersion.findMany({
    where: { gameId: game.id },
    orderBy: [{ latest: 'desc' }, { releaseDate: 'desc' }, { createdAt: 'desc' }],
    include: { files: { select: { type: true, sizeBytes: true, checksum: true, checksumAlgo: true, scanStatus: true } } },
  });

  return NextResponse.json({
    items: versions.map((v) => ({
      id: v.id,
      version: v.version,
      releaseDate: v.releaseDate,
      changelog: v.changelog,
      sizeBytes: v.sizeBytes != null ? Number(v.sizeBytes) : null,
      latest: v.latest,
      playOnline: v.playOnline,
      note: v.note,
      files: v.files.map((f) => ({
        type: f.type,
        sizeBytes: f.sizeBytes != null ? Number(f.sizeBytes) : null,
        checksum: f.checksum,
        checksumAlgo: f.checksumAlgo,
        available: f.scanStatus !== 'QUARANTINED',
      })),
    })),
  });
}
