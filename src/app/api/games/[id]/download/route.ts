import { NextResponse } from 'next/server';
import type { GameFileType } from '@prisma/client';
import { db } from '@/lib/db';
import { getActor } from '@/lib/actor';
import { fileTypeFitsPlatform } from '@/lib/game';
import { downloadFileName, signedFileUrl, SIGNED_URL_TTL } from '@/lib/game-files';
import { recordGameEvent } from '@/lib/game-stats';
import { checkGameAccess } from '@/lib/game-unlock';
import { auth } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit-memory';

export const dynamic = 'force-dynamic';

/**
 * GET /api/games/{id|slug}/download?version=<id>&type=<GameFileType>
 *
 * `version` xác định luôn nền tảng (mỗi version thuộc đúng một nền tảng), nên
 * không cần tham số platform riêng. Backend kiểm tra file (tồn tại, hợp nền
 * tảng, đã quét sạch) rồi cấp signed URL có hạn. Sự kiện download được ghi
 * nhận tại đây, unique download chống trùng theo actor nên tải lặp bất thường
 * không làm phồng số liệu.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get('type')?.toUpperCase() as GameFileType | undefined;
  if (!type) return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });

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
    select: { id: true, slug: true, title: true, pricePoints: true },
  });
  if (!game) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  // Game có giá thì phải mở khoá mới cấp được liên kết. Kiểm ở đây chứ không
  // chỉ ở giao diện: ai đoán ra địa chỉ API cũng không lấy được tệp.
  const session = await auth();
  const access = await checkGameAccess(
    session?.user?.id ?? null,
    game,
    (session?.user as { role?: string } | undefined)?.role,
  );
  if (!access.allowed) {
    return NextResponse.json({ error: 'LOCKED', price: access.price }, { status: 403 });
  }

  const versionId = url.searchParams.get('version');
  const version = versionId
    ? await db.gameVersion.findFirst({ where: { id: versionId, gameId: game.id }, include: { files: true } })
    : await db.gameVersion.findFirst({
        where: { gameId: game.id },
        orderBy: [{ latest: 'desc' }, { releaseDate: 'desc' }],
        include: { files: true },
      });
  if (!version) return NextResponse.json({ error: 'VERSION_NOT_FOUND' }, { status: 404 });

  if (!fileTypeFitsPlatform(version.platform, type)) {
    return NextResponse.json({ error: 'BAD_TYPE' }, { status: 400 });
  }

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
    meta: { platform: version.platform, fileType: type, version: version.version },
  });

  const signed = signedFileUrl(file.storageKey, actor.actorKey);
  const body = {
    url: signed,
    fileName: file.fileName ?? downloadFileName(game.slug, version.version, type),
    sizeBytes: file.sizeBytes != null ? Number(file.sizeBytes) : null,
    checksum: file.checksum,
    checksumAlgo: file.checksumAlgo,
    expiresInSec: SIGNED_URL_TTL,
    platform: version.platform,
    version: version.version,
  };

  // `?redirect=1` để dùng trực tiếp trong thẻ <a> (trình duyệt đi thẳng tới CDN).
  if (url.searchParams.get('redirect') === '1') {
    return NextResponse.redirect(new URL(signed, url.origin), 302);
  }
  return NextResponse.json(body);
}
