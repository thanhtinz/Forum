import { NextResponse } from 'next/server';
import { getActor } from '@/lib/actor';
import { closeSession } from '@/lib/emulator';

export const dynamic = 'force-dynamic';

/** POST /api/emulator/sessions/{id}/close — đóng phiên, chốt thống kê. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();
  const result = await closeSession(id, { userId: actor.userId, guestKey: actor.guestKey });
  if (!result) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(result);
}
