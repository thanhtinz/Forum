import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { QuayXeng } from '@/components/giaitri/QuayXeng';
import { VAN_MOI_NGAY, conLai } from '@/lib/mini-game';
import { GopTrenDienThoai } from '@/components/GopTrenDienThoai';

export const metadata: Metadata = { title: 'Máy quay xèng' };
export const dynamic = 'force-dynamic';

export default async function Trang() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  // Không in số điểm ở đây: điểm đã nằm sẵn trên thanh đầu trang.
  const con = userId ? await conLai(userId, 'QUAYXENG') : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Khu giải trí
      </Link>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Máy quay xèng</h1>
          {userId && <span className="retro-sub text-ink-400">Còn {con} ván hôm nay</span>}
        </div>

        {userId ? <QuayXeng conLai={con} /> : (
          <p className="text-sm text-ink-500">
            <Link href="/login?callbackUrl=/giai-tri/quay-xeng" className="font-semibold text-brand-600 hover:underline">
              Đăng nhập
            </Link>{' '}để chơi.
          </p>
        )}
      </section>

      <GopTrenDienThoai tieuDe="Luật chơi" className="card mt-4 p-5 text-sm text-ink-600 dark:text-ink-300">
        <ul className="list-inside list-disc space-y-1">
          <li>Mỗi lượt quay ra chín ô. Ba ô giống nhau trên cùng một hàng, một cột hoặc một đường chéo là trúng.</li>
          <li>Trúng nhiều đường thì cộng dồn bội số của từng đường.</li>
          <li>Bội số đã tính cả tiền cược: trúng một đường 2× nghĩa là hoà, từ 3× trở lên mới có lãi.</li>
          <li>Không đường nào trùng thì mất cược.</li>
          <li>Cược 10–100 điểm.</li>
          <li>Mỗi ngày {VAN_MOI_NGAY} ván.</li>
        </ul>
      </GopTrenDienThoai>
    </div>
  );
}
