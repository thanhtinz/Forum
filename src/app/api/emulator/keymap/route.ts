import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { isValidKeymap } from '@/lib/emulator-keys';

export const dynamic = 'force-dynamic';

/**
 * Key mapping lưu theo user + emulator profile.
 * GET  /api/emulator/keymap?profile=<id|slug>
 * PUT  /api/emulator/keymap   { profileId, mapping }
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ mapping: null });

  const key = new URL(req.url).searchParams.get('profile');
  if (!key) return NextResponse.json({ error: 'MISSING_PROFILE' }, { status: 400 });

  const profile = await db.emulatorProfile.findFirst({ where: { OR: [{ id: key }, { slug: key }] }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const row = await db.userKeymap.findUnique({
    where: { userId_profileId: { userId: session.user.id, profileId: profile.id } },
  });
  return NextResponse.json({ profileId: profile.id, mapping: row?.mapping ?? null });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { profileId?: string; mapping?: unknown } | null;
  if (!body?.profileId || !isValidKeymap(body.mapping)) {
    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  }
  if (Object.keys(body.mapping).length > 64) {
    return NextResponse.json({ error: 'TOO_LARGE' }, { status: 400 });
  }

  const profile = await db.emulatorProfile.findUnique({ where: { id: body.profileId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const saved = await db.userKeymap.upsert({
    where: { userId_profileId: { userId: session.user.id, profileId: profile.id } },
    update: { mapping: body.mapping },
    create: { userId: session.user.id, profileId: profile.id, mapping: body.mapping },
  });
  return NextResponse.json({ profileId: saved.profileId, mapping: saved.mapping });
}
