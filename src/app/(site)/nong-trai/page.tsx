import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { xemNongTrai } from '@/lib/farm';
import {
  ANH_FARM, GIA_MOI_O, KHE_MAX, KHE_MIN, O_DAT_BAN_DAU, O_DAT_TOI_DA, TUOI_RUT_NGAN,
} from '@/lib/farm-const';
import { NongTrai } from '@/components/farm/NongTrai';

export const metadata: Metadata = {
  title: 'Nông trại',
  description: 'Gieo hạt, tưới nước, thu hoạch rồi bán lấy điểm — nông trại pixel của diễn đàn.',
};
export const dynamic = 'force-dynamic';

export default async function NongTraiPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const d = userId ? await xemNongTrai(userId) : null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 flex items-center gap-2 text-xl font-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ANH_FARM} alt="" aria-hidden className="h-8 w-auto"
          style={{ imageRendering: 'pixelated' }} />
        Nông trại
      </h1>

      {d ? <NongTrai d={d} /> : (
        <p className="card p-5 text-sm text-ink-500">
          <Link href="/login?callbackUrl=/nong-trai" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>{' '}để nhận {O_DAT_BAN_DAU} ô đất đầu tiên.
        </p>
      )}

      <section className="card mt-4 p-5 text-sm text-ink-600 dark:text-ink-300">
        <h2 className="zib-title mb-3">Luật chơi</h2>
        <ul className="list-inside list-disc space-y-1">
          <li>Bắt đầu với {O_DAT_BAN_DAU} ô đất; mở thêm giá số ô đang có × {GIA_MOI_O} điểm, tối đa {O_DAT_TOI_DA} ô.</li>
          <li>Gieo hạt trả điểm trước, cây chín theo đúng số phút của giống ấy.</li>
          <li>Tưới nước miễn phí, mỗi vụ một lần: chín sớm hơn {Math.round(TUOI_RUT_NGAN * 100)}% và thu được nhiều hơn.</li>
          <li>Thu hoạch xong nông sản vào nhà kho, bán lúc nào cũng được.</li>
          <li>Cây khế hái mỗi giờ một lần, được {KHE_MIN}–{KHE_MAX} điểm, không mất gì.</li>
        </ul>
      </section>
    </div>
  );
}
