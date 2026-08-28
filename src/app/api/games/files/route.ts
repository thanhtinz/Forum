import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyFileToken } from '@/lib/game-files';
import { getActor } from '@/lib/actor';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Thư mục gốc chứa file game khi chưa gắn object storage/CDN. */
const STORAGE_DIR = resolve(process.env.GAME_STORAGE_DIR ?? './storage/games');

const MIME: Record<string, string> = {
  JAR: 'application/java-archive',
  JAD: 'text/vnd.sun.j2me.app-descriptor',
  PATCH: 'application/octet-stream',
};

/**
 * GET /api/games/files?token=… — phục vụ file game qua signed URL.
 *
 * Chỉ dùng khi chưa cấu hình `GAME_CDN_URL`. Token đã ký ràng buộc storage key,
 * hạn dùng và người tải.
 */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'MISSING_TOKEN' }, { status: 400 });

  const payload = verifyFileToken(token);
  if (!payload) return NextResponse.json({ error: 'INVALID_OR_EXPIRED' }, { status: 403 });

  // Token có ghi người tải (`a`) nhưng ghi thôi thì chưa ràng buộc được gì —
  // phải SO với người đang gọi. Không so thì chỉ cần chép địa chỉ dán ra ngoài
  // là ai cũng tải được game phải trả điểm, suốt cả thời hạn của token.
  const actor = await getActor();
  if (payload.a && payload.a !== actor.actorKey) {
    return NextResponse.json({ error: 'WRONG_ACTOR' }, { status: 403 });
  }

  const file = await db.gameFile.findFirst({
    where: { storageKey: payload.k },
    include: { version: { include: { game: { select: { slug: true } } } } },
  });
  if (!file) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  if (file.scanStatus === 'QUARANTINED') return NextResponse.json({ error: 'QUARANTINED' }, { status: 423 });

  // Chống path traversal: key đã ký vẫn phải nằm trong thư mục storage.
  const abs = normalize(join(STORAGE_DIR, payload.k));
  if (!abs.startsWith(STORAGE_DIR + sep)) return NextResponse.json({ error: 'BAD_KEY' }, { status: 400 });
  if (!existsSync(abs)) {
    return NextResponse.json(
      { error: 'FILE_MISSING', message: 'File chưa được đồng bộ lên storage.' },
      { status: 404 },
    );
  }

  const stat = statSync(abs);
  const name = file.fileName ?? `${file.version.game.slug}-${file.version.version}.${file.type.toLowerCase()}`;
  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream<Uint8Array>;

  return new NextResponse(stream, {
    headers: {
      'Content-Type': file.mimeType ?? MIME[file.type] ?? 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'private, max-age=0, no-store',
      ...(file.checksum ? { 'X-Checksum-Sha256': file.checksum } : {}),
    },
  });
}
