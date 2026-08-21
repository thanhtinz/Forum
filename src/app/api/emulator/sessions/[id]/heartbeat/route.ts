import { NextResponse } from 'next/server';
import type { SessionStatus } from '@prisma/client';
import { getActor } from '@/lib/actor';
import { heartbeat } from '@/lib/emulator';

export const dynamic = 'force-dynamic';

const ALLOWED: SessionStatus[] = ['LOADING', 'RUNNING', 'PAUSED', 'RECONNECTING', 'ERROR'];

/**
 * POST /api/emulator/sessions/{id}/heartbeat
 *
 * Client gửi mỗi ~20s. Không nhận heartbeat quá idleTimeout + grace thì phiên
 * bị dọn; hết maximum duration thì chuyển EXPIRED.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getActor();

  let body: { status?: string; error?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    // heartbeat rỗng là hợp lệ
  }

  const status = body.status && (ALLOWED as string[]).includes(body.status) ? (body.status as SessionStatus) : undefined;
  const result = await heartbeat(id, { userId: actor.userId, guestKey: actor.guestKey }, { status, error: body.error });
  if (!result) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  return NextResponse.json(result);
}
