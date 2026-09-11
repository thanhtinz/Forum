import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import '../globals.css';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { MenuQuanTri } from '@/components/quan-tri/MenuQuanTri';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Quản trị · SunnyStore', template: '%s · Quản trị SunnyStore' },
  // Khu quản trị không có gì để cho máy tìm kiếm lập chỉ mục, mà lộ ra danh
  // sách đường dẫn quản trị thì chỉ tổ mời người ta tới gõ cửa.
  robots: { index: false, follow: false },
};

/*
 * KHU QUẢN TRỊ — MỘT TRANG RIÊNG, VỎ RIÊNG.
 *
 * Đây là một BỐ CỤC GỐC thứ hai, ngang hàng với bố cục của cửa hàng chứ không
 * nằm trong nó: tệp này tự dựng lấy <html> và <body>. Nhờ vậy khu quản trị
 * không mang theo thanh bên, thanh tab đáy hay ô tìm game của mặt tiền — mấy
 * thứ ấy nói chuyện với người đi mua hàng, còn ở đây là người coi kho.
 *
 * Hai bố cục gốc song song là cách Next dựng hai vỏ khác hẳn nhau trong cùng
 * một dự án. Cái giá phải trả: đi từ khu này sang khu kia là một lượt tải
 * trang đầy đủ, không phải chuyển trang mềm. Ở đây đổi ấy là đáng — người ta
 * ra vào khu quản trị vài lần một ngày, chứ không phải vài lần một phút.
 *
 * CỔNG CHẶN đặt ở đây, không đặt ở từng trang con: thêm một trang mới mà quên
 * chép đoạn kiểm quyền là cả trang ấy mở toang. Nhưng nhớ rằng đây chỉ chặn
 * GIAO DIỆN — mỗi hàm trong tệp `'use server'` vẫn phải tự kiểm quyền lấy, vì
 * nó là một địa chỉ POST công khai, gọi thẳng vào được mà không qua đây.
 */
export default async function GocQuanTri({ children }: { children: React.ReactNode }) {
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');
  if (nguoi.vaiTro !== 'QUAN_TRI') redirect('/');

  return (
    <html lang="vi">
      <body className="min-h-screen bg-nen3">
        <a href="#noi-dung" className="nhay-toi-noi-dung">Tới nội dung chính</a>

        {/*
          ĐẦU TRANG RIÊNG — nền sẫm, không logo cửa hàng.

          Cố ý trông khác hẳn mặt tiền. Người vừa sửa xong một game rồi mở tab
          mới phải biết ngay mình đang đứng ở đâu, mà cách nhanh nhất để biết
          là cả trang đổi màu — nhanh hơn đọc một dòng chữ.
        */}
        <header className="sticky top-0 z-40 border-b border-vien bg-chu text-nen">
          <div className="mx-auto flex h-14 max-w-[1100px] items-center gap-4 px-4 sm:px-6">
            <Link href="/quan-tri" className="text-[15px] font-bold tracking-tight">
              SunnyStore <span className="font-normal opacity-70">Quản trị</span>
            </Link>

            <MenuQuanTri />

            <span className="ml-auto flex items-center gap-4 text-[13px]">
              <span className="hidden opacity-70 sm:inline">{nguoi.tenHienThi}</span>
              {/* Lối về mặt tiền, mở tab mới: đang sửa dở một game mà bấm nhầm
                  rồi mất hết chữ đang gõ là chuyện không nên xảy ra. */}
              <a href="/" target="_blank" rel="noreferrer"
                className="font-semibold underline-offset-2 hover:underline">
                Xem cửa hàng
              </a>
            </span>
          </div>
        </header>

        <main id="noi-dung" className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
          {children}
        </main>

        <footer className="mx-auto max-w-[1100px] px-4 pb-10 pt-2 text-[12px] text-mo sm:px-6">
          <p>Khu quản trị SunnyStore · mọi thay đổi ở đây hiện ra ngay ngoài cửa hàng.</p>
        </footer>
      </body>
    </html>
  );
}
