import Link from 'next/link';
import type { Metadata } from 'next';
import { auth } from '@/lib/auth';
import { xemChuong } from '@/lib/rong';
import { ChuongRong } from '@/components/rong/ChuongRong';
import { DU_BO, GIA_TRUNG } from '@/lib/rong-const';

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

  const chuong = userId ? await xemChuong(userId) : null;

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
    </div>
  );
}
