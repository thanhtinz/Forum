import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getActor } from '@/lib/actor';
import { LIVE_STATUSES } from '@/lib/emulator';

export const dynamic = 'force-dynamic';

/** GET /api/emulator/sessions/{id} — trạng thái phiên. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();

  const session = await db.emulatorSession.findUnique({
    where: { id },
    include: {
      game: { select: { slug: true, title: true } },
      gameVersion: { select: { version: true } },
      profile: { select: { slug: true, name: true, screenWidth: true, screenHeight: true, orientation: true, idleTimeoutSec: true, sessionMaxSec: true } },
    },
  });
  if (!session) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const owned = session.userId ? session.userId === actor.userId : session.guestKey === actor.guestKey;
  if (!owned) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });

  return NextResponse.json({
    id: session.id,
    status: session.status,
    queuePosition: session.queuePosition,
    live: LIVE_STATUSES.includes(session.status),
    createdAt: session.createdAt,
    startedAt: session.startedAt,
    lastHeartbeatAt: session.lastHeartbeatAt,
    endedAt: session.endedAt,
    expiresAt: session.expiresAt,
    remainingSec: Math.max(0, Math.round((session.expiresAt.getTime() - Date.now()) / 1000)),
    durationSec: session.durationSec,
    playedSec: session.playedSec,
    error: session.error,
    game: session.game,
    version: session.gameVersion.version,
    profile: session.profile,
  });
}
