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

        <p className="font-semibold text-ink-800 dark:text-ink-100">Một phiên</p>
        <p className="mt-1">
          Cả nhà chung một bàn. Mỗi phiên {giay(BAUCUA_ROUND_MS)} giây:{' '}
          {giay(BAUCUA_BET_MS)} giây nhận cửa, {giay(BAUCUA_XOC_MS)} giây xóc bát,
          rồi mở bát cho tới hết phiên. Hết giờ nhận cửa là bàn khoá, không ai đặt
          thêm được nữa.
        </p>

        <p className="mt-3 font-semibold text-ink-800 dark:text-ink-100">Đặt cửa</p>
        <p className="mt-1">
          Sáu cửa: Nai, Bầu, Gà, Cá, Cua, Tôm. Một phiên đặt được nhiều cửa, mỗi
          cửa từ {BAUCUA_MIN} đến {BAUCUA_MAX} điểm. Điểm trừ ngay lúc đặt.
        </p>

        <p className="mt-3 font-semibold text-ink-800 dark:text-ink-100">Ăn thua</p>
        <p className="mt-1">
          Ba viên xóc độc lập nhau. Cửa nào có mặt trong bát thì được trả lại tiền
          đặt, cộng thêm đúng bấy nhiêu lần tiền đặt cho mỗi viên trúng:
        </p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>trúng 1 viên → nhận gấp đôi tiền đặt</li>
          <li>trúng 2 viên → nhận gấp ba</li>
          <li>trúng 3 viên → nhận gấp bốn</li>
          <li>không viên nào → mất tiền đặt cửa ấy</li>
        </ul>

        <p className="mt-3 font-semibold text-ink-800 dark:text-ink-100">Giới hạn</p>
        <p className="mt-1">
          Mỗi ngày {BAUCUA_PHIEN_MOI_NGAY} phiên. Tỉ lệ trả thưởng giữ đúng như
          bản gốc, nghĩa là về lâu dài bàn luôn thu về nhiều hơn chi ra — chơi cho
          vui, đừng coi là chỗ kiếm điểm.
        </p>
      </section>
    </div>
  );
}
