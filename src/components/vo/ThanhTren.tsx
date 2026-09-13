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
export function ThanhTren({ nguoi, tuKhoa, chuaDoc = 0, nen }: {
  nguoi: NguoiDangNhap | null;
  /** Nền đang dùng, đọc từ bánh quy ở bố cục gốc — xem `dat-nen.ts`. */
  nen: 'sang' | 'toi';
  tuKhoa?: string;
  chuaDoc?: number;
}) {
  return (
    <header className="kinh-tren sticky top-0 z-30">
      {/*
        BA RÃNH BẰNG NHAU, không phải một hàng `flex` với `mx-auto`.

        Lối cũ để ô tìm tự căn giữa phần chỗ CÒN LẠI sau khi mấy nút bên phải
        đã chiếm xong, nên trục giữa của nó lệch khỏi trục giữa của trang chừng
        bảy chục điểm ảnh — trên máy tính để bàn thì thấy rõ ô tìm không thẳng
        hàng với cột nội dung ngay dưới nó.

        Hai rãnh ngoài cùng `1fr` nên luôn rộng bằng nhau, dù bên trái trống
        trơn còn bên phải đầy nút. Rãnh giữa ôm đúng bề ngang của cột đọc
        (`.cot`, 680px), nên ô tìm và cột nội dung chung một trục.

        CHỈ TỪ `lg` TRỞ LÊN. Trên điện thoại thì không có cột nội dung nào để
        thẳng hàng cùng, mà hai rãnh `1fr` lại ăn mất chỗ của ô tìm — đủ để câu
        gợi ý bị cắt cụt giữa chừng. Khổ nhỏ quay về lối cũ: hai bên ôm vừa nội
        dung, ô tìm lấy hết phần còn lại.
      */}
      <div className="khung grid grid-cols-[auto_1fr_auto] items-center gap-2 py-2.5
        lg:grid-cols-[1fr_minmax(0,680px)_1fr]">
        {/* Một thẻ duy nhất cho rãnh trái: thêm thẻ thứ hai là lưới ba cột đẩy
            ô tìm xuống hàng dưới. Ở khổ lớn nó rỗng, nhưng vẫn giữ chỗ. */}
        <div className="flex items-center">
          <Link href="/" className="shrink-0 lg:hidden" aria-label="SunnyStore — về trang đầu">
            <DauHieu co={30} chu={false} />
          </Link>
        </div>

        <OTim giaTriDau={tuKhoa} />

        <div className="flex items-center justify-end gap-2">
          <DoiNen banDau={nen} />

          {nguoi && <Chuong chuaDoc={chuaDoc} />}

          {nguoi ? (
            <Link href="/toi" aria-label="Tài khoản của bạn" className="shrink-0">
              <AnhDaiDien ten={nguoi.tenHienThi} anh={nguoi.anh} co={36} />
            </Link>
          ) : (
            <Link href="/dang-nhap" className="nut-xam shrink-0 !px-4 max-sm:!px-3">Đăng nhập</Link>
          )}
        </div>
      </div>
    </header>
  );
}

