import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { avgRating } from '@/lib/game';
import { assetUrl } from '@/lib/game-files';

export const dynamic = 'force-dynamic';

/** GET /api/games/{id|slug} — chi tiết game. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const game = await db.game.findFirst({
    where: { OR: [{ id }, { slug: id }], status: 'PUBLISHED' },
    include: {
      platform: true,
      resolution: true,
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
      versions: { orderBy: [{ platform: 'asc' }, { latest: 'desc' }, { releaseDate: 'desc' }], include: { files: true } },
      images: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!game) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  return NextResponse.json({
    id: game.id,
    slug: game.slug,
    title: game.title,
    titleVi: game.titleVi,
    series: game.series,
    description: game.description,
    gameplay: game.gameplay,
    icon: assetUrl(game.icon),
    cover: assetUrl(game.cover),
    trailerUrl: game.trailerUrl,
    developer: game.developer,
    publisher: game.publisher,
    releaseYear: game.releaseYear,
    language: game.language,
    vietnamized: game.vietnamized,
    platform: game.platform && { slug: game.platform.slug, name: game.platform.name },
    resolution: game.resolution && { slug: game.resolution.slug, label: game.resolution.label },
    genres: game.genres.map((g) => ({ slug: g.genre.slug, name: g.genre.name })),
    tags: game.tags.map((t) => ({ slug: t.tag.slug, name: t.tag.name })),
    controls: game.controls,
    compatibilityNote: game.compatibilityNote,
    knownIssues: game.knownIssues,
    rating: avgRating(game.ratingSum, game.ratingCount),
    ratingCount: game.ratingCount,
    stats: {
      views: game.viewCount,
      uniqueViews: game.uniqueViewCount,
      downloads: game.downloadCount,
      uniqueDownloads: game.uniqueDownloadCount,
      trendingScore: game.trendingScore,
    },
    versions: game.versions.map((v) => ({
      id: v.id,
      platform: v.platform,
      version: v.version,
      releaseDate: v.releaseDate,
      changelog: v.changelog,
      sizeBytes: v.sizeBytes != null ? Number(v.sizeBytes) : null,
      latest: v.latest,
      files: v.files.map((f) => ({ type: f.type, sizeBytes: f.sizeBytes != null ? Number(f.sizeBytes) : null, checksum: f.checksum, checksumAlgo: f.checksumAlgo })),
    })),
    screenshots: game.images
      .filter((i) => i.type === 'SCREENSHOT')
      .map((i) => ({ url: assetUrl(i.storageKey), caption: i.caption, width: i.width, height: i.height })),
    publishedAt: game.publishedAt,
    updatedAt: game.updatedAt,
  });
}
