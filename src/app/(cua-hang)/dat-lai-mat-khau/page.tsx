import type { Metadata } from 'next';
import Link from 'next/link';
import { DauHieu } from '@/components/vo/DauHieu';
import { ODatLaiMatKhau } from '@/components/ODatLaiMatKhau';

export const metadata: Metadata = {
  title: 'Đặt lại mật khẩu',
  // Trang này chỉ có nghĩa với ai đang cầm mã trong tay.
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/*
 * NHẬP MÃ, ĐỔI MẬT KHẨU.
 *
 * Nhận sẵn mã qua địa chỉ (`?ma=…`) để ban quản trị gửi được nguyên một đường
 * dẫn bấm là vào — nhưng ô nhập vẫn còn đó cho ai chép tay. Mã nằm trên địa
 * chỉ thì có nằm lại trong lịch sử trình duyệt, nhưng nó chết ngay sau lần
 * dùng đầu và tự hết hạn trong một ngày; đổi lại là người dùng khỏi phải chép
 * một dãy bốn mươi ký tự.
 */
export default async function TrangDatLai(
  { searchParams }: { searchParams: Promise<{ ma?: string }> },
) {
  const { ma } = await searchParams;

  return (
    <div className="mx-auto max-w-sm py-6">
      <Link href="/" className="mx-auto mb-5 block w-fit" aria-label="SunnyStore — về trang đầu">
        <DauHieu co={44} />
      </Link>
      <h1 className="text-center text-[22px] font-bold tracking-tight">Đặt lại mật khẩu</h1>
      <p className="phu mt-1 text-center">
        Nhập mã ban quản trị đưa, rồi chọn mật khẩu mới.
      </p>

      <ODatLaiMatKhau maSan={ma} />

      <p className="phu mt-5 text-center">
        Chưa có mã? <Link href="/quen-mat-khau" className="font-semibold text-nhan hover:underline">
          Xem cách xin mã
        </Link>
      </p>
    </div>
  );
}
