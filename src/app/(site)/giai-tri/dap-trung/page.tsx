import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { DapTrung } from '@/components/giaitri/DapTrung';
import { VAN_MOI_NGAY, conLai } from '@/lib/mini-game';
import { GopTrenDienThoai } from '@/components/GopTrenDienThoai';

export const metadata: Metadata = { title: 'Đập trứng' };
export const dynamic = 'force-dynamic';

export default async function Trang() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  // Không in số điểm ở đây: điểm đã nằm sẵn trên thanh đầu trang.
  const con = userId ? await conLai(userId, 'DAPTRUNG') : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Khu giải trí
      </Link>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Đập trứng</h1>
          {userId && <span className="retro-sub text-ink-400">Còn {con} ván hôm nay</span>}
        </div>

        {userId ? <DapTrung conLai={con} /> : (
          <p className="text-sm text-ink-500">
            <Link href="/login?callbackUrl=/giai-tri/dap-trung" className="font-semibold text-brand-600 hover:underline">
              Đăng nhập
            </Link>{' '}để chơi.
          </p>
        )}
      </section>

      <GopTrenDienThoai tieuDe="Luật chơi" className="card mt-4 p-5 text-sm text-ink-600 dark:text-ink-300">
        <ul className="list-inside list-disc space-y-1">
          <li>Năm quả trứng, đúng một quả có quà. Chọn một quả rồi đập.</li>
          <li>Đập trúng ăn 3× cược; nếu quả ấy đúng luôn là quả vàng thì 7×.</li>
          <li>Đập trượt mất cược.</li>
          <li>Cược 10–100 điểm.</li>
          <li>Mỗi ngày {VAN_MOI_NGAY} ván.</li>
        </ul>
      </GopTrenDienThoai>
    </div>
  );
}
