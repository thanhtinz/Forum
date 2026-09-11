import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BieuMauXacThuc } from '@/components/BieuMauXacThuc';
import { dangNhap } from './viec';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const metadata: Metadata = { title: 'Đăng nhập' };
export const dynamic = 'force-dynamic';

export default async function TrangDangNhap() {
  // Đã đăng nhập rồi mà vẫn mở trang này thì đưa về trang chủ: hiện một biểu
  // mẫu đăng nhập cho người đang đăng nhập chỉ tổ làm họ tưởng đã bị đăng xuất.
  if (await nguoiHienTai()) redirect('/');

  return (
    <BieuMauXacThuc
      viec={dangNhap}
      tieuDe="Đăng nhập"
      phu="Để lưu thư viện game và tham gia thảo luận."
      nut="Đăng nhập"
      duoi={<>Chưa có tài khoản? <Link href="/dang-ky" className="font-semibold text-nhan hover:underline">Đăng ký</Link></>}
    >
      <label className="block">
        <span className="phu mb-1 block">Email hoặc tên đăng nhập</span>
        <input name="dinhDanh" required autoComplete="username" className="o-nhap" />
      </label>
      <label className="block">
        <span className="phu mb-1 block">Mật khẩu</span>
        <input name="matKhau" type="password" required autoComplete="current-password" className="o-nhap" />
      </label>
    </BieuMauXacThuc>
  );
}
