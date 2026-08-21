import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import { NextResponse } from 'next/server';
import type { SaveKind } from '@prisma/client';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Sandbox filesystem cho save/RMS — mỗi user một nhánh riêng. */
const SAVE_DIR = resolve(process.env.GAME_SAVE_DIR ?? './storage/saves');
/** Giới hạn kích thước một bản lưu (RMS của game Java ME rất nhỏ). */
const MAX_SAVE_BYTES = 512 * 1024;

function saveKey(userId: string, versionId: string, kind: SaveKind, slot: number): string {
  return `${userId}/${versionId}/${kind.toLowerCase()}-${slot}.bin`;
}

function absPath(key: string): string | null {
  const abs = normalize(join(SAVE_DIR, key));
  return abs.startsWith(SAVE_DIR + sep) ? abs : null;
}

/**
 * Cloud save cho tài khoản đăng nhập. Khách chơi vẫn lưu được nhưng chỉ ở
 * localStorage phía trình duyệt (xem `EmulatorStage`), không đẩy lên server.
 *
 * GET  /api/emulator/sessions/{id}/state?kind=RMS&slot=0
 * POST /api/emulator/sessions/{id}/state  { kind, slot, label, data(base64) }
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const emu = await db.emulatorSession.findFirst({
    where: { id, userId: session.user.id },
    select: { gameVersionId: true },
  });
  if (!emu) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const url = new URL(req.url);
  const kind = (url.searchParams.get('kind') ?? 'RMS').toUpperCase() as SaveKind;
  const slot = Number(url.searchParams.get('slot') ?? 0) || 0;

  const row = await db.saveState.findUnique({
    where: {
      userId_gameVersionId_kind_slot: { userId: session.user.id, gameVersionId: emu.gameVersionId, kind, slot },
    },
  });
  if (!row) return NextResponse.json({ data: null });

  const abs = absPath(row.storageKey);
  if (!abs) return NextResponse.json({ error: 'BAD_KEY' }, { status: 400 });
  const buf = await readFile(abs).catch(() => null);
  if (!buf) return NextResponse.json({ data: null });

  return NextResponse.json({
    data: buf.toString('base64'),
    label: row.label,
    sizeBytes: row.sizeBytes,
    updatedAt: row.updatedAt,
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });

  const emu = await db.emulatorSession.findFirst({
    where: { id, userId: session.user.id },
    select: { gameVersionId: true, profile: { select: { rms: true, saveState: true } } },
  });
  if (!emu) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  const body = (await req.json().catch(() => null)) as
    | { kind?: string; slot?: number; label?: string; data?: string }
    | null;
  if (!body?.data) return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });

  const kind = (body.kind ?? 'RMS').toUpperCase() as SaveKind;
  if (kind !== 'RMS' && kind !== 'STATE') return NextResponse.json({ error: 'BAD_KIND' }, { status: 400 });
  if (kind === 'RMS' && !emu.profile.rms) return NextResponse.json({ error: 'RMS_DISABLED' }, { status: 409 });
  if (kind === 'STATE' && !emu.profile.saveState) return NextResponse.json({ error: 'SAVE_STATE_DISABLED' }, { status: 409 });

  const buf = Buffer.from(body.data, 'base64');
  if (buf.byteLength === 0 || buf.byteLength > MAX_SAVE_BYTES) {
    return NextResponse.json({ error: 'BAD_SIZE' }, { status: 413 });
  }

  const slot = Number.isInteger(body.slot) ? Math.max(0, Math.min(9, body.slot!)) : 0;
  const key = saveKey(session.user.id, emu.gameVersionId, kind, slot);
  const abs = absPath(key);
  if (!abs) return NextResponse.json({ error: 'BAD_KEY' }, { status: 400 });

  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buf);

  const row = await db.saveState.upsert({
    where: {
      userId_gameVersionId_kind_slot: { userId: session.user.id, gameVersionId: emu.gameVersionId, kind, slot },
    },
    update: { storageKey: key, sizeBytes: buf.byteLength, label: body.label?.slice(0, 80) ?? null },
    create: {
      userId: session.user.id,
      gameVersionId: emu.gameVersionId,
      kind,
      slot,
      storageKey: key,
      sizeBytes: buf.byteLength,
      label: body.label?.slice(0, 80) ?? null,
    },
  });

  return NextResponse.json({ ok: true, slot: row.slot, sizeBytes: row.sizeBytes, updatedAt: row.updatedAt });
}
