import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { xemNongTrai } from '@/lib/farm';
import {
  ANH_FARM, GIA_MOI_O, KHE_MIN, KHE_MAX, O_DAT_BAN_DAU, O_DAT_TOI_DA, TUOI_RUT_NGAN,
} from '@/lib/farm-const';
import { AnhPixel } from '@/components/farm/AnhPixel';
import { NongTrai } from '@/components/farm/NongTrai';
import { GopTrenDienThoai } from '@/components/GopTrenDienThoai';

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
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-3 flex items-center gap-2 text-xl font-black">
        <AnhPixel src={ANH_FARM} className="h-9 w-auto" />
        Nông trại
      </h1>

      {d ? <NongTrai d={d} /> : (
        <p className="card p-5 text-sm text-ink-500">
          <Link href="/login?callbackUrl=/nong-trai" className="font-semibold text-brand-600 hover:underline">
            Đăng nhập
          </Link>{' '}để nhận {O_DAT_BAN_DAU} ô đất đầu tiên.
        </p>
      )}

      {/* Luật chơi để cuối và giữ thật ngắn: người chơi quay lại lần thứ hai
          là không đọc nữa, nên nó không được chiếm chỗ của mảnh ruộng. */}
      <GopTrenDienThoai tieuDe="Luật chơi" className="card mt-4 px-4 py-3 text-sm text-ink-600 dark:text-ink-300">
        <ul className="grid list-inside list-disc gap-x-6 gap-y-1 marker:text-brand-400 sm:grid-cols-2">
          <li>Bắt đầu {O_DAT_BAN_DAU} ô, mở thêm giá số ô đang có × {GIA_MOI_O}, tối đa {O_DAT_TOI_DA} ô.</li>
          <li>Gieo hạt trả trước, cây chín đúng số phút của giống.</li>
          <li>Mỗi vụ tưới được một lần: chín sớm hơn {Math.round(TUOI_RUT_NGAN * 100)}%, thu nhiều hơn.</li>
          <li>Thu hoạch vào kho, bán lúc nào cũng được.</li>
          <li>Cây khế hái mỗi giờ một lần, được {KHE_MIN}–{KHE_MAX} điểm, không mất gì.</li>
        </ul>
      </GopTrenDienThoai>
    </div>
  );
}
