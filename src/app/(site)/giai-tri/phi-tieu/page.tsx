import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { PhiTieu } from '@/components/giaitri/PhiTieu';
import { VAN_MOI_NGAY, conLai } from '@/lib/mini-game';
import { GopTrenDienThoai } from '@/components/GopTrenDienThoai';

export const metadata: Metadata = { title: 'Phi tiêu' };
export const dynamic = 'force-dynamic';

export default async function Trang() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  // Không in số điểm ở đây: điểm đã nằm sẵn trên thanh đầu trang.
  const con = userId ? await conLai(userId, 'PHITIEU') : 0;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/giai-tri" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Khu giải trí
      </Link>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-black">Phi tiêu</h1>
          {userId && <span className="retro-sub text-ink-400">Còn {con} ván hôm nay</span>}
        </div>

        {userId ? <PhiTieu conLai={con} /> : (
          <p className="text-sm text-ink-500">
            <Link href="/login?callbackUrl=/giai-tri/phi-tieu" className="font-semibold text-brand-600 hover:underline">
              Đăng nhập
            </Link>{' '}để chơi.
          </p>
        )}
      </section>

      <GopTrenDienThoai tieuDe="Luật chơi" className="card mt-4 p-5 text-sm text-ink-600 dark:text-ink-300">
        <ul className="list-inside list-disc space-y-1">
          <li>Bạn và máy mỗi bên ném một mũi, ai được điểm cao hơn thì thắng.</li>
          <li>Thắng được đúng số điểm đã cược, thua mất đúng số ấy.</li>
          <li>Bằng điểm thì hoà, không mất gì.</li>
          <li>Cược 10–100 điểm.</li>
          <li>Mỗi ngày {VAN_MOI_NGAY} ván.</li>
        </ul>
      </GopTrenDienThoai>
    </div>
  );
}
