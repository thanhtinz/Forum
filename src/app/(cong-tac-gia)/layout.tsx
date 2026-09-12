import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import '../globals.css';
import { MA_DAT_NEN } from '@/lib/dat-nen';
import { DauHieu } from '@/components/vo/DauHieu';

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
 * Vỏ ở đây cố ý mỏng: một thanh trên, một dòng chữ, và lối về cửa hàng. Người
 * mở trang này chưa có gì để quản lý, nên không có thanh bên nào cả.
 */
export default function GocCongTacGia({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MA_DAT_NEN }} />
      </head>
      <body className="bg-nen">
        <a href="#noi-dung" className="nhay-toi-noi-dung">Tới nội dung chính</a>

        <header className="kinh-tren sticky top-0 z-30">
          <div className="khung flex items-center gap-3 py-2.5">
            <Link href="/tac-gia/dang-ky" className="flex items-center gap-2">
              <DauHieu co={30} chu={false} />
              <span className="text-[15px] font-bold tracking-tight">
                SunnyStore <span className="font-medium text-mo">cho nhà phát triển</span>
              </span>
            </Link>

            {/*
              Lối về cửa hàng là một đường dẫn THƯỜNG, không phải địa chỉ tuyệt
              đối: người đang đứng ở cổng nhà phát triển bấm vào thì phần mềm
              trung gian tự đưa về đúng tên miền cửa hàng, còn người đang ở
              chính cửa hàng thì nó chỉ là một lối về trang đầu.
            */}
            <Link href="/" className="ml-auto flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-mo hover:text-chu">
              <ArrowLeft size={15} aria-hidden /> Về cửa hàng
            </Link>
          </div>
        </header>

        <main id="noi-dung" className="khung py-7">{children}</main>
      </body>
    </html>
  );
}
