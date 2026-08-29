import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Coins } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtCount } from '@/lib/utils';
import { BauCua } from '@/components/giaitri/BauCua';
import { BAUCUA_MAX, BAUCUA_MIN, VAN_MOI_NGAY, conLai } from '@/lib/mini-game';

export const metadata: Metadata = { title: 'Bầu cua tôm cá' };
export const dynamic = 'force-dynamic';

export default async function BauCuaPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const [me, con] = await Promise.all([
    userId ? db.user.findUnique({ where: { id: userId }, select: { points: true } }) : null,
    userId ? conLai(userId, 'BAUCUA') : Promise.resolve(0),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Khu giải trí
      </Link>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Bầu cua tôm cá</h1>
          {me && (
            <span className="flex items-center gap-1.5 text-sm">
              <Coins size={15} className="text-amber-500" /> <b>{fmtCount(me.points)}</b> điểm
            </span>
          )}
        </div>

        {userId ? <BauCua conLai={con} /> : (
          <p className="text-sm text-ink-500">
            <Link href="/login?callbackUrl=/giai-tri/bau-cua" className="font-semibold text-brand-600 hover:underline">
              Đăng nhập
            </Link>{' '}để chơi.
          </p>
        )}
      </section>

      <section className="card mt-4 p-5 text-sm text-ink-600 dark:text-ink-300">
        <h2 className="zib-title mb-2">Luật chơi</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Đặt cửa một con, cược {BAUCUA_MIN}–{BAUCUA_MAX} điểm, xóc ba viên.</li>
          <li>Ba viên độc lập nhau. Trúng bao nhiêu viên thì ăn bấy nhiêu lần tiền cược.</li>
          <li>Không viên nào trúng thì mất cược.</li>
          <li>Mỗi ngày {VAN_MOI_NGAY} ván.</li>
        </ul>
        <p className="mt-3 text-ink-500">
          Nói thẳng: tính cả bốn khả năng thì trung bình mỗi ván người chơi lỗ
          khoảng <b>7,9%</b> số điểm cược — đúng như bản gốc. Đây là chỗ tiêu
          điểm cho vui, không phải chỗ kiếm điểm.
        </p>
      </section>
    </div>
  );
}
