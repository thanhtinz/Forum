import type { Metadata } from 'next';
import '../globals.css';
import { MA_DAT_NEN } from '@/lib/dat-nen';
import { LOI_DI_CONG_TAC_GIA } from '@/lib/tac-gia-loi-di';
import { DauTrangTacGia } from '@/components/tac-gia/DauTrangTacGia';
import { ChanTrangTacGia } from '@/components/tac-gia/ChanTrangTacGia';

export const metadata: Metadata = {
  title: { default: 'SunnyStore cho nhà phát triển', template: '%s · SunnyStore cho nhà phát triển' },
  robots: { index: false, follow: false },
};

/*
 * CỔNG NHÀ PHÁT TRIỂN — phần MỞ, dành cho người chưa là tác giả.
 *
 * Bố cục gốc thứ tư, và nó tồn tại vì một lẽ rất cụ thể: trang xin làm tác giả
 * phải mặc vỏ của cổng nhà phát triển (người ta tới đây qua
 * `developer.sunnystore.vn`), nhưng KHÔNG được nằm trong bố cục của bảng tác
 * giả — bố cục ấy có cổng chặn đẩy người chưa có quyền về chính trang này, tức
 * là một vòng lặp vô tận.
 *
 * Đầu trang và chân trang dùng CHUNG với bảng tác giả: hai bố cục gốc nhưng
 * người dùng chỉ thấy MỘT trang web, nên vỏ phải liền một mạch — được duyệt
 * đơn xong, thanh trên mọc thêm mấy mục chứ không phải cả trang đổi kiểu.
 */
export default function GocCongTacGia({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MA_DAT_NEN }} />
      </head>
      <body className="bg-nen">
        <a href="#noi-dung" className="nhay-toi-noi-dung">Tới nội dung chính</a>

        {/* Chân trang phải nằm dưới đáy màn hình kể cả khi nội dung ngắn, nên
            cả thân trang là một cột cao tối thiểu bằng màn hình. */}
        <div className="flex min-h-screen flex-col">
          <DauTrangTacGia loiDi={[...LOI_DI_CONG_TAC_GIA]} trangChu="/tac-gia/dang-ky" />
          <main id="noi-dung" className="khung flex-1 py-7">{children}</main>
          <ChanTrangTacGia />
        </div>
      </body>
    </html>
  );
}
