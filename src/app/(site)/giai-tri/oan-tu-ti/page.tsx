import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Coins } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtCount } from '@/lib/utils';
import { OanTuTi } from '@/components/giaitri/OanTuTi';
import { OTT_MAX, OTT_MIN, VAN_MOI_NGAY, conLai } from '@/lib/mini-game';

export const metadata: Metadata = { title: 'Oẳn tù tì' };
export const dynamic = 'force-dynamic';

export default async function OanTuTiPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const [me, con] = await Promise.all([
    userId ? db.user.findUnique({ where: { id: userId }, select: { points: true } }) : null,
    userId ? conLai(userId, 'OANTUTI') : Promise.resolve(0),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Khu giải trí
      </Link>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Oẳn tù tì</h1>
          {me && (
            <span className="flex items-center gap-1.5 text-sm">
              <Coins size={15} className="text-amber-500" /> <b>{fmtCount(me.points)}</b> điểm
            </span>
          )}
        </div>

        {userId ? <OanTuTi conLai={con} /> : (
          <p className="text-sm text-ink-500">
            <Link href="/login?callbackUrl=/giai-tri/oan-tu-ti" className="font-semibold text-brand-600 hover:underline">
              Đăng nhập
            </Link>{' '}để chơi.
          </p>
        )}
      </section>

      <section className="card mt-4 p-5 text-sm text-ink-600 dark:text-ink-300">
        <h2 className="zib-title mb-3">Luật chơi</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Búa thắng Kéo, Kéo thắng Bao, Bao thắng Búa.</li>
          <li>Thắng được đúng số điểm đã cược, thua mất đúng số ấy.</li>
          <li>Ra trùng tay thì hoà, không mất điểm nào.</li>
          <li>Mỗi ván cược {OTT_MIN}–{OTT_MAX} điểm, mỗi ngày {VAN_MOI_NGAY} ván.</li>
        </ul>
      </section>

    </div>
  );
}
