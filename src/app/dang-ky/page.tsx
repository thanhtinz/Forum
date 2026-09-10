import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BieuMauXacThuc } from '@/components/BieuMauXacThuc';
import { dangKy } from '../dang-nhap/viec';
import { nguoiHienTai } from '@/lib/xac-thuc';

export const metadata: Metadata = { title: 'Đăng ký' };
export const dynamic = 'force-dynamic';

export default async function TrangDangKy() {
  if (await nguoiHienTai()) redirect('/');

  return (
    <BieuMauXacThuc
      viec={dangKy}
      tieuDe="Tạo tài khoản"
      phu="Chỉ cần ba ô. Tải game thì không cần tài khoản."
      nut="Tạo tài khoản"
      duoi={<>Đã có tài khoản? <Link href="/dang-nhap" className="font-semibold text-nhan hover:underline">Đăng nhập</Link></>}
    >
      <label className="block">
        <span className="phu mb-1 block">Tên hiển thị</span>
        <input name="tenHienThi" required minLength={2} maxLength={40} autoComplete="nickname" className="o-nhap" />
      </label>
      <label className="block">
        <span className="phu mb-1 block">Email</span>
        <input name="email" type="email" required autoComplete="email" className="o-nhap" />
      </label>
      <label className="block">
        <span className="phu mb-1 block">Mật khẩu</span>
        <input name="matKhau" type="password" required minLength={8} autoComplete="new-password" className="o-nhap" />
        <span className="phu mt-1 block">Ít nhất 8 ký tự.</span>
      </label>
    </BieuMauXacThuc>
  );
}
