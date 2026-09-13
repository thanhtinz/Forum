import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DauHieu } from '@/components/vo/DauHieu';
import { OXacMinhDangKy } from '@/components/OXacMinhDangKy';
import { HAN_MA_PHUT } from '@/lib/ma-xac-minh-const';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const metadata: Metadata = {
  title: 'Xác minh email',
  // Chỉ có nghĩa với ai vừa mở tài khoản và đang cầm mã.
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/*
 * BƯỚC HAI CỦA ĐĂNG KÝ.
 *
 * Tới đây thì CHƯA CÓ TÀI KHOẢN NÀO cả — hồ sơ đang nằm tạm trong hàng mã, và
 * chỉ thành tài khoản khi gõ đúng mã. Xem `xacMinhDangKy` để biết vì sao không
 * dựng sẵn tài khoản rồi đánh dấu "chưa xác minh".
 *
 * Email đi qua địa chỉ chứ không giữ trong phiên: người mở thư trên điện thoại
 * rồi quay lại gõ trên máy bàn vẫn phải vào đúng chỗ này, mà phiên thì không
 * theo họ sang máy khác. Địa chỉ email lộ ra trên thanh địa chỉ cũng chẳng mất
 * gì — nó là email của chính người đang ngồi đó.
 */
export default async function TrangXacMinh(
  { searchParams }: { searchParams: Promise<{ email?: string }> },
) {
  if (await nguoiHienTai()) redirect('/');
  const { email } = await searchParams;
  if (!email) redirect('/dang-ky');

  return (
    <div className="mx-auto max-w-sm py-6">
      <Link href="/" className="mx-auto mb-5 block w-fit" aria-label="SunnyStore — về trang đầu">
        <DauHieu co={44} />
      </Link>
      <h1 className="text-center text-[22px] font-bold tracking-tight">Xác minh email</h1>
      <p className="phu mt-1 text-center leading-relaxed">
        Mã sáu số vừa được gửi tới <span className="font-semibold text-chu">{email}</span>.
        Mã sống {HAN_MA_PHUT} phút.
      </p>

      <OXacMinhDangKy email={email} />

      <p className="phu mt-5 text-center leading-relaxed">
        Không thấy thư? Ngó cả hộp thư rác.
        {' '}
        <Link href="/dang-ky" className="font-semibold text-nhan hover:underline">
          Gõ lại email
        </Link>
      </p>
    </div>
  );
}
