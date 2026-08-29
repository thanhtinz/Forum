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
        <h2 className="zib-title mb-2">Luật chơi</h2>
        <p className="font-semibold text-ink-800 dark:text-ink-100">Cách chơi</p>
        <p className="mt-1">
          Chọn một tay rồi đặt cược, máy ra tay cùng lúc. Búa thắng Kéo, Kéo
          thắng Bao, Bao thắng Búa.
        </p>

        <p className="mt-3 font-semibold text-ink-800 dark:text-ink-100">Ăn thua</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>thắng → được đúng số điểm đã cược</li>
          <li>thua → mất đúng số điểm đã cược</li>
          <li>ra trùng tay → hoà, không mất điểm nào</li>
        </ul>

        <p className="mt-3 font-semibold text-ink-800 dark:text-ink-100">Giới hạn</p>
        <p className="mt-1">
          Mỗi ván cược từ {OTT_MIN} đến {OTT_MAX} điểm, mỗi ngày {VAN_MOI_NGAY} ván.
          Ba khả năng thắng, hoà, thua chia đều nhau nên chơi lâu thì điểm về gần
          chỗ cũ.
        </p>
      </section>
    </div>
  );
}
