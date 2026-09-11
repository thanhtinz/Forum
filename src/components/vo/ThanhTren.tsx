import Link from 'next/link';
import { OTim } from './OTim';
import { DauHieu } from './DauHieu';
import { DoiNen } from './DoiNen';
import { Chuong } from './Chuong';
import { AnhDaiDien } from '@/components/NguoiDung';
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
export function ThanhTren({ nguoi, tuKhoa, chuaDoc = 0 }: {
  nguoi: NguoiDangNhap | null;
  tuKhoa?: string;
  chuaDoc?: number;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-vien bg-nen/95 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-2.5 sm:px-6">
        <Link href="/" className="shrink-0 lg:hidden" aria-label="SunnyStore — về trang đầu">
          <DauHieu co={30} chu={false} />
        </Link>

        <div className="mx-auto flex w-full max-w-2xl items-center gap-1">
          <OTim giaTriDau={tuKhoa} />
        </div>

        <DoiNen />

        {nguoi && <Chuong chuaDoc={chuaDoc} />}

        {nguoi ? (
          <Link href="/toi" aria-label="Tài khoản của bạn" className="shrink-0">
            <AnhDaiDien ten={nguoi.tenHienThi} anh={nguoi.anh} co={36} />
          </Link>
        ) : (
          <Link href="/dang-nhap" className="nut-xam shrink-0 !px-4 max-sm:!px-3">Đăng nhập</Link>
        )}
      </div>
    </header>
  );
}

