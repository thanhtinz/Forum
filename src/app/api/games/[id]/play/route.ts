import { NextResponse } from 'next/server';
import { getActor } from '@/lib/actor';
import { createEmulatorSession, PlayDenied } from '@/lib/emulator';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/games/{id|slug}/play — tạo phiên emulator.
 *
 * Body (tuỳ chọn): { versionId, profileId }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor(true);

  // Rate limit Play Online: mở phiên là thao tác tốn tài nguyên.
  const limit = rateLimit(`play:${actor.actorKey}`, 10, 300);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', message: 'Bạn mở phiên chơi quá nhanh, hãy chờ một chút.', retryAfterSec: limit.retryAfterSec },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
    );
  }

  let body: { versionId?: string; profileId?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // body rỗng — dùng version/profile mặc định
  }

  try {
    const result = await createEmulatorSession({
      gameSlugOrId: id,
      versionId: body.versionId ?? null,
      profileId: body.profileId ?? null,
      userId: actor.userId,
      guestKey: actor.guestKey,
      actorKey: actor.actorKey,
      ip: actor.ip,
      userAgent: actor.userAgent,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof PlayDenied) {
      const status = e.code === 'GAME_NOT_FOUND' ? 404 : e.code === 'BREAKER_OPEN' ? 503 : 409;
      return NextResponse.json({ error: e.code, message: e.message }, { status });
    }
    throw e;
  }
}
