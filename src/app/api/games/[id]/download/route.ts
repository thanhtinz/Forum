import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActor } from '@/lib/actor';
import { downloadFileName, signedFileUrl, SIGNED_URL_TTL } from '@/lib/game-files';
import { recordGameEvent } from '@/lib/game-stats';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/games/{id|slug}/download?version=<id>&type=JAR|JAD
 *
 * Backend kiểm tra file (tồn tại, đã quét sạch) rồi cấp signed URL có hạn.
 * Sự kiện download được ghi nhận tại đây, unique download chống trùng theo
 * actor nên tải lặp bất thường không làm phồng số liệu.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const type = (url.searchParams.get('type') ?? 'JAR').toUpperCase();
  if (type !== 'JAR' && type !== 'JAD') {
    return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });
  }

  const actor = await getActor(true);
  const limit = rateLimit(`dl:${actor.actorKey}`, 30, 60);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retryAfterSec: limit.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  const game = await db.game.findFirst({
    where: { OR: [{ id }, { slug: id }], status: 'PUBLISHED' },
    select: { id: true, slug: true, title: true },
  });
  if (!game) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const versionId = url.searchParams.get('version');
  const version = versionId
    ? await db.gameVersion.findFirst({ where: { id: versionId, gameId: game.id }, include: { files: true } })
    : await db.gameVersion.findFirst({
        where: { gameId: game.id },
        orderBy: [{ latest: 'desc' }, { releaseDate: 'desc' }],
        include: { files: true },
      });
  if (!version) return NextResponse.json({ error: 'VERSION_NOT_FOUND' }, { status: 404 });

  const file = version.files.find((f) => f.type === type);
  if (!file) return NextResponse.json({ error: 'FILE_NOT_FOUND' }, { status: 404 });
  if (file.scanStatus === 'QUARANTINED') {
    return NextResponse.json({ error: 'FILE_QUARANTINED' }, { status: 423 });
  }

  await recordGameEvent({
    gameId: game.id,
    versionId: version.id,
    userId: actor.userId,
    actorKey: actor.actorKey,
    type: 'DOWNLOAD',
    meta: { fileType: type, version: version.version },
  });

  const signed = signedFileUrl(file.storageKey, actor.actorKey);
  const body = {
    url: signed,
    fileName: file.fileName ?? downloadFileName(game.slug, version.version, type),
    sizeBytes: file.sizeBytes != null ? Number(file.sizeBytes) : null,
    checksum: file.checksum,
    checksumAlgo: file.checksumAlgo,
    expiresInSec: SIGNED_URL_TTL,
    version: version.version,
  };

  // `?redirect=1` để dùng trực tiếp trong thẻ <a> (trình duyệt đi thẳng tới CDN).
  if (url.searchParams.get('redirect') === '1') {
    return NextResponse.redirect(new URL(signed, url.origin), 302);
  }
  return NextResponse.json(body);
}
