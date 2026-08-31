import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { xemChuong } from '@/lib/rong';
import { ChuongRong } from '@/components/rong/ChuongRong';
import { GopTrenDienThoai } from '@/components/GopTrenDienThoai';
import {
  AN_CHO_MS, AP_MS, CHOI_CHO_MS, CHUONG_TOI_DA, DAU_MOI_NGAY, DU_BO,
  GIA_AN, GIA_NO_NGAY, GIA_TRUNG, PHI_DAU, THUONG_THANG, moTaConLai,
} from '@/lib/rong-const';

export const metadata: Metadata = { title: 'Đảo rồng' };
export const dynamic = 'force-dynamic';

/**
 * Trang chính của Đảo Rồng: cái chuồng.
 *
 * Ba nhánh, vì ba tình cảnh khác hẳn nhau — khách vãng lai chỉ cần lời mời
 * đăng nhập, người chưa nuôi con nào chỉ cần một việc duy nhất là mua quả
 * trứng đầu tiên, còn người đang nuôi thì cần cái chuồng. Dựng chung một khối
 * "đa năng" thì hai nhóm đầu phải nhìn một màn hình trống rỗng.
 */
export default async function RongPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const chuong = userId ? await xemChuong(userId, AN_CHO_MS, CHOI_CHO_MS) : null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">Đảo rồng</h1>

      {!chuong ? (
        <section className="rong-tam p-5">
          <p className="text-sm text-ink-500">
            <Link href="/login?callbackUrl=/rong" className="font-semibold text-brand-600 hover:underline">
              Đăng nhập
            </Link>{' '}để ấp trứng và nuôi rồng.
          </p>
        </section>
      ) : chuong.dan.length === 0 && chuong.soTrung === 0 ? (
        <section className="rong-tam p-5 text-center">
          <h2 className="zib-title mb-1">Chưa nuôi con nào</h2>
          <p className="mb-4 text-sm text-ink-500">
            Chín loài rồng, mỗi loài sáu màu — cả thảy {DU_BO} con. Bắt đầu bằng một quả trứng.
          </p>
          <Link href="/rong/ap-trung" className="rong-nut inline-block px-4 py-2 text-sm">
            Mua quả trứng đầu tiên · {GIA_TRUNG} điểm
          </Link>
        </section>
      ) : (
        <ChuongRong d={chuong} />
      )}

      <GopTrenDienThoai tieuDe="Luật chơi" className="rong-tam p-5 text-sm text-ink-600 dark:text-ink-300">
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
