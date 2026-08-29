import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { BanBauCua } from '@/components/giaitri/BanBauCua';
import { xemBan, phienConLai } from '@/lib/bau-cua';
import {
  BAUCUA_BET_MS, BAUCUA_MAX, BAUCUA_MIN, BAUCUA_PHIEN_MOI_NGAY, BAUCUA_ROUND_MS, BAUCUA_XOC_MS,
} from '@/lib/mini-game';

export const metadata: Metadata = { title: 'Bầu cua tôm cá' };
export const dynamic = 'force-dynamic';

const giay = (ms: number) => Math.round(ms / 1000);

export default async function BauCuaPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [ban, con] = await Promise.all([
    xemBan(userId),
    userId ? phienConLai(userId) : Promise.resolve(0),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Khu giải trí
      </Link>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Bầu cua tôm cá</h1>
          {userId && <span className="retro-sub text-ink-400">Còn {con} phiên hôm nay</span>}
        </div>

        {userId ? <BanBauCua ban0={ban} /> : (
          <p className="text-sm text-ink-500">
            <Link href="/login?callbackUrl=/giai-tri/bau-cua" className="font-semibold text-brand-600 hover:underline">
              Đăng nhập
            </Link>{' '}để ngồi vào bàn.
          </p>
        )}
      </section>

      <section className="card mt-4 p-5 text-sm text-ink-600 dark:text-ink-300">
        <h2 className="zib-title mb-3">Luật chơi</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>
            Mỗi phiên {giay(BAUCUA_ROUND_MS)} giây: {giay(BAUCUA_BET_MS)} giây nhận cửa,{' '}
            {giay(BAUCUA_XOC_MS)} giây xóc, rồi mở bát.
          </li>
          <li>Một phiên đặt được nhiều cửa, mỗi cửa {BAUCUA_MIN}–{BAUCUA_MAX} điểm.</li>
          <li>Trúng 1 viên nhận gấp đôi, 2 viên gấp ba, 3 viên gấp bốn tiền đặt.</li>
          <li>Cửa không trúng viên nào thì mất tiền đặt cửa ấy.</li>
          <li>Mỗi ngày {BAUCUA_PHIEN_MOI_NGAY} phiên.</li>
        </ul>
      </section>

    </div>
  );
}
