import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** GET /api/emulator/profiles/{id|slug} — mô tả thiết bị ảo. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.emulatorProfile.findFirst({ where: { OR: [{ id }, { slug: id }] } });
  if (!p) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });

  return NextResponse.json({
    id: p.id,
    slug: p.slug,
    name: p.name,
    vendor: p.vendor,
    screen: { width: p.screenWidth, height: p.screenHeight, orientation: p.orientation },
    cldc: p.cldc,
    midp: p.midp,
    keyLayout: p.keyLayout,
    capabilities: {
      softKeys: p.softKeys,
      audio: p.audio,
      rms: p.rms,
      saveState: p.saveState,
      touch: p.touch,
    },
    keymap: p.keymap,
    limits: {
      cpuMillicores: p.cpuMillicores,
      ramLimitMb: p.ramLimitMb,
      sessionMaxSec: p.sessionMaxSec,
      idleTimeoutSec: p.idleTimeoutSec,
      gracePeriodSec: p.gracePeriodSec,
      maxConcurrent: p.maxConcurrent,
    },
    active: p.active,
  });
}
