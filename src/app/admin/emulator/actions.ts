'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { assertAdmin } from '@/lib/admin';
import { db } from '@/lib/db';
import { terminateSession } from '@/lib/emulator';
import { isValidKeymap } from '@/lib/emulator-keys';

export interface ActionState { ok?: boolean; error?: string }

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === 'string' && v.trim() ? v.trim() : null;
};
const bool = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
const int = (fd: FormData, k: string, fallback: number) => {
  const v = str(fd, k);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

/** Tạo mới hoặc cập nhật một emulator profile (thiết bị ảo). */
export async function upsertProfile(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await assertAdmin();

  const name = str(fd, 'name');
  if (!name) return { error: 'Thiếu tên profile.' };

  const id = str(fd, 'id');
  const slug = slugify(str(fd, 'slug') ?? name);
  if (!slug) return { error: 'Slug không hợp lệ.' };

  const clash = await db.emulatorProfile.findFirst({
    where: { slug, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) return { error: 'Slug đã tồn tại.' };

  const keymapRaw = str(fd, 'keymap');
  let keymap: unknown = null;
  if (keymapRaw) {
    try {
      keymap = JSON.parse(keymapRaw);
    } catch {
      return { error: 'Keymap phải là JSON hợp lệ.' };
    }
    if (!isValidKeymap(keymap)) return { error: 'Keymap có phím không hợp lệ.' };
  }

  const data = {
    slug,
    name,
    vendor: str(fd, 'vendor'),
    screenWidth: int(fd, 'screenWidth', 240),
    screenHeight: int(fd, 'screenHeight', 320),
    orientation: (str(fd, 'orientation') ?? 'PORTRAIT') as 'PORTRAIT' | 'LANDSCAPE',
    cldc: str(fd, 'cldc') ?? '1.1',
    midp: str(fd, 'midp') ?? '2.0',
    keyLayout: str(fd, 'keyLayout') ?? 'nokia',
    softKeys: bool(fd, 'softKeys'),
    audio: bool(fd, 'audio'),
    rms: bool(fd, 'rms'),
    saveState: bool(fd, 'saveState'),
    touch: bool(fd, 'touch'),
    keymap: keymap as never,
    cpuMillicores: int(fd, 'cpuMillicores', 500),
    ramLimitMb: int(fd, 'ramLimitMb', 256),
    sessionMaxSec: int(fd, 'sessionMaxSec', 1800),
    idleTimeoutSec: int(fd, 'idleTimeoutSec', 120),
    gracePeriodSec: int(fd, 'gracePeriodSec', 60),
    maxConcurrent: int(fd, 'maxConcurrent', 50),
    runtimeUrl: str(fd, 'runtimeUrl'),
    active: bool(fd, 'active'),
  };

  if (id) {
    await db.emulatorProfile.update({ where: { id }, data });
    revalidatePath(`/admin/emulator/${id}`);
    revalidatePath('/admin/emulator');
    return { ok: true };
  }

  const created = await db.emulatorProfile.create({ data });
  revalidatePath('/admin/emulator');
  redirect(`/admin/emulator/${created.id}`);
}

export async function deleteProfile(id: string): Promise<void> {
  await assertAdmin();
  await db.emulatorProfile.delete({ where: { id } });
  revalidatePath('/admin/emulator');
  redirect('/admin/emulator');
}

export async function toggleProfileActive(id: string): Promise<void> {
  await assertAdmin();
  const p = await db.emulatorProfile.findUnique({ where: { id }, select: { active: true } });
  if (!p) return;
  await db.emulatorProfile.update({ where: { id }, data: { active: !p.active } });
  revalidatePath('/admin/emulator');
}

/** Buộc kết thúc một phiên đang chạy. */
export async function killSession(sessionId: string): Promise<void> {
  await assertAdmin();
  await terminateSession(sessionId);
  revalidatePath('/admin/emulator');
}
