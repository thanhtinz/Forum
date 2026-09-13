import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BieuMauXacThuc } from '@/components/BieuMauXacThuc';
import { dangNhap } from './viec';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { ONhapGiu } from '@/components/ONhapGiu';

export const metadata: Metadata = { title: 'Đăng nhập' };
export const dynamic = 'force-dynamic';

export default async function TrangDangNhap({ searchParams }: {
  searchParams: Promise<{ tiep?: string }>;
}) {
  const { tiep } = await searchParams;
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
      {/* Đường về đi kèm biểu mẫu chứ không giữ trong phiên: người mở hai tab
          đăng nhập cho hai trang khác nhau thì mỗi tab phải về đúng chỗ của
          nó. Lọc đường về nằm ở máy chủ — xem `duongVe` trong `viec.ts`. */}
      {tiep && <input type="hidden" name="tiep" value={tiep} />}

      <label className="block">
        <span className="phu mb-1 block">Email hoặc tên đăng nhập</span>
        <ONhapGiu name="dinhDanh" required autoComplete="username" className="o-nhap" />
      </label>
      <label className="block">
        {/* Lối "quên mật khẩu" nằm NGAY CẠNH nhãn ô mật khẩu, không nhét xuống
            cuối trang: người ta chỉ nhớ ra mình quên đúng vào lúc nhìn cái ô
            này, chứ không phải lúc đọc hết cả trang. */}
        <span className="mb-1 flex items-baseline justify-between gap-3">
          <span className="phu">Mật khẩu</span>
          <Link href="/quen-mat-khau" className="text-[13px] font-semibold text-nhan hover:underline">
            Quên mật khẩu?
          </Link>
        </span>
        <input name="matKhau" type="password" required autoComplete="current-password" className="o-nhap" />
      </label>
    </BieuMauXacThuc>
  );
}
