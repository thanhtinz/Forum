import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/lib/auth';
import { timDoiThu, xemDao } from '@/lib/rong';
import { DaoRong } from '@/components/rong/DaoRong';
import { GopTrenDienThoai } from '@/components/GopTrenDienThoai';
import {
  AN_CHO_MS, AP_MS, CHOI_CHO_MS, CHUONG_TOI_DA, DAU_MOI_NGAY, DU_BO,
  GIA_AN, GIA_NO_NGAY, GIA_TRUNG, PHI_DAU, THUONG_THANG, moTaConLai,
} from '@/lib/rong-const';

export const metadata: Metadata = { title: 'Đảo rồng' };
export const dynamic = 'force-dynamic';

export default async function RongPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const [dao, doiThu] = userId
    ? await Promise.all([xemDao(userId, AN_CHO_MS, CHOI_CHO_MS), timDoiThu(userId)])
    : [null, []];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/giai-tri" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Khu giải trí
      </Link>

      <h1 className="mb-4 text-xl font-black">Đảo rồng</h1>

      {dao ? (
        <DaoRong d={dao} doiThu={doiThu} />
      ) : (
        <section className="card p-5">
          <p className="text-sm text-ink-500">
            <Link href="/login?callbackUrl=/rong" className="font-semibold text-brand-600 hover:underline">
              Đăng nhập
            </Link>{' '}để ấp trứng và nuôi rồng.
          </p>
        </section>
      )}

      <GopTrenDienThoai tieuDe="Luật chơi" className="card mt-4 p-5 text-sm text-ink-600 dark:text-ink-300">
        <ul className="grid list-inside list-disc gap-x-6 gap-y-1 marker:text-brand-400 sm:grid-cols-2">
          <li>Trứng giá {GIA_TRUNG} điểm, nở sau {moTaConLai(AP_MS)}; trả thêm {GIA_NO_NGAY} điểm thì nở ngay.</li>
          <li>Nở ra con gì là ngẫu nhiên trong {DU_BO} con, chuồng chứa tối đa {CHUONG_TOI_DA} con.</li>
          <li>Cho ăn {GIA_AN} điểm mỗi bữa, cách nhau {moTaConLai(AN_CHO_MS)}; chơi bóng miễn phí.</li>
          <li>Bỏ bê thì độ vui tụt dần, mà vui càng thấp thì đánh càng yếu.</li>
          <li>Đấu trường: ghi danh {PHI_DAU} điểm, thắng được {THUONG_THANG}, hoà hoàn phí, mỗi ngày {DAU_MOI_NGAY} trận.</li>
          <li>Người bị thách đấu không mất điểm, dù thắng hay thua.</li>
        </ul>
      </GopTrenDienThoai>
    </div>
  );
}
