import Link from 'next/link';
import { OTim } from './OTim';
import { DoiNen } from './DoiNen';
import type { NguoiDangNhap } from '@/lib/xac-thuc';

/**
 * Thanh đầu trang — có ở MỌI khổ màn hình.
 *
 * Đúng bố cục của cửa hàng ứng dụng trên web: ô tìm chiếm gần hết bề ngang,
 * ảnh đại diện nằm sát mép phải. Tìm kiếm là lối vào của gần một nửa số người
 * mở cửa hàng — họ đã biết tên game rồi, chỉ cần chỗ gõ vào.
 *
 * Dấu hiệu nhận biết trang chỉ hiện ở khổ nhỏ: từ `lg` trở lên nó đã nằm trên
 * đầu thanh bên rồi, in hai lần là thừa.
 */
export function ThanhTren({ nguoi, tuKhoa }: { nguoi: NguoiDangNhap | null; tuKhoa?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-vien bg-nen/95 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 lg:hidden">
          <span className="grid size-8 place-items-center rounded-[9px] bg-nhan text-[15px] font-black text-white">N</span>
        </Link>

        <div className="mx-auto flex w-full max-w-2xl items-center gap-1">
          <OTim giaTriDau={tuKhoa} />
        </div>

        <DoiNen />

        {nguoi ? (
          <Link href="/toi" aria-label="Tài khoản của bạn" className="shrink-0">
            <AnhDaiDien nguoi={nguoi} />
          </Link>
        ) : (
          <Link href="/dang-nhap" className="nut-xam shrink-0 !px-4 max-sm:!px-3">Đăng nhập</Link>
        )}
      </div>
    </header>
  );
}

function AnhDaiDien({ nguoi }: { nguoi: NguoiDangNhap }) {
  if (nguoi.anh) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={nguoi.anh} alt="" className="size-9 rounded-full object-cover" />;
  }
  return (
    <span className="grid size-9 place-items-center rounded-full bg-nhan/15 text-sm font-bold text-nhan">
      {nguoi.tenHienThi.slice(0, 1).toUpperCase()}
    </span>
  );
}
