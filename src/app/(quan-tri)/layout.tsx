import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import '../globals.css';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { demViecTonDong } from '@/lib/quan-tri-dem';
import { NganKeoQuanTri } from '@/components/quan-tri/NganKeoQuanTri';
import { docNen } from '@/lib/dat-nen';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Quản trị · SunnyStore', template: '%s · Quản trị SunnyStore' },
  // Khu quản trị không có gì để máy tìm kiếm lập chỉ mục, mà lộ ra danh sách
  // đường dẫn quản trị thì chỉ tổ mời người ta tới gõ cửa.
  robots: { index: false, follow: false },
};

/*
 * KHU QUẢN TRỊ — MỘT TRANG RIÊNG, VỎ RIÊNG.
 *
 * Đây là BỐ CỤC GỐC thứ hai, ngang hàng với bố cục cửa hàng chứ không nằm
 * trong nó: tệp này tự dựng lấy <html> và <body>. Nhờ vậy khu quản trị không
 * mang theo thanh bên, thanh tab đáy hay ô tìm game của mặt tiền — mấy thứ ấy
 * nói chuyện với người đi mua hàng, còn ở đây là người bán hàng.
 *
 * Cái giá: đi từ khu này sang khu kia là một lượt tải trang đầy đủ. Đáng —
 * người ta ra vào khu quản trị vài lần một ngày, không phải vài lần một phút.
 *
 * CỔNG CHẶN đặt ở đây, không ở từng trang con: thêm một trang mới mà quên chép
 * đoạn kiểm quyền là cả trang ấy mở toang. Nhưng đây chỉ chặn GIAO DIỆN — mỗi
 * hàm trong tệp `'use server'` vẫn phải tự kiểm quyền lấy, vì nó là một địa
 * chỉ POST công khai, gọi thẳng vào được mà không qua đây.
 */
export default async function GocQuanTri({ children }: { children: React.ReactNode }) {
  const nen = await docNen();
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');
  if (nguoi.vaiTro !== 'QUAN_TRI') redirect('/');

  const dem = await demViecTonDong();

  return (
    <html lang="vi" data-nen={nen}>
      <body className="bg-nen3">
        <a href="#noi-dung" className="nhay-toi-noi-dung">Tới nội dung chính</a>

        {/*
          MỘT THANH ĐẦU TRANG, MỘT NÚT BA GẠCH — giống nhau ở mọi khổ.

          Bản trước có hai bộ điều hướng: cột đứng cố định từ `lg` trở lên, và
          dải chip cuộn ngang ở khổ nhỏ. Nuôi hai lối trình bày cho cùng một
          danh sách thì chúng trôi khỏi nhau, và đã trôi thật — dải ngang bỏ mất
          tiêu đề nhóm, nên mười ba mục thành một dãy phẳng mà phần lớn khuất
          ngoài mép phải.

          Nền sẫm thì giữ, và đó vẫn là chủ ý: người vừa sửa xong một game rồi
          mở tab mới phải biết ngay mình đang đứng ở đâu, mà cách nhanh nhất để
          biết là cả trang đổi màu — nhanh hơn đọc một dòng chữ.

          `sticky` chứ không `fixed`: thanh này mỏng, mà khu quản trị toàn bảng
          dài — giữ nó luôn trong tầm mắt thì cuộn tới cuối bảng vẫn mở được
          menu, mà không phải chừa chỗ trống trên đầu mọi trang.
        */}
        {/* `data-vo` là mốc cho bài kiểm 27 bắt lấy: nó đo độ sáng của vỏ
            khu này ở cả hai nền. Dò theo tên thẻ thì đổi `aside` thành
            `header` là bài kiểm mù, mà nó mù thì im lặng chứ không đỏ. */}
        <header data-vo="quan-tri" className="sticky top-0 z-40 bg-vo-qt">
          <div className="mx-auto flex max-w-[1080px] items-center gap-3 px-4 py-2.5 sm:px-6">
            <NganKeoQuanTri dem={dem} ten={nguoi.tenHienThi} />

            <Link href="/quan-tri" className="min-w-0 truncate text-[14px] font-bold tracking-tight text-vo-qt-chu">
              SunnyStore <span className="font-normal text-vo-qt-chu/55">Quản trị</span>
            </Link>

            {/* Mở tab mới: đang sửa dở một game mà bấm nhầm rồi mất hết chữ
                đang gõ là chuyện không nên xảy ra. */}
            <a href="/" target="_blank" rel="noreferrer"
              className="ml-auto shrink-0 text-[12px] font-semibold text-vo-qt-chu/55 hover:text-vo-qt-chu">
              Xem cửa hàng
            </a>
          </div>
        </header>

        <div>
          <main id="noi-dung" className="mx-auto max-w-[1080px] px-4 py-6 sm:px-6 lg:py-8">
            {children}
          </main>

          <footer className="mx-auto max-w-[1080px] px-4 pb-10 text-[12px] text-mo sm:px-6">
            <p>Khu quản trị SunnyStore · mọi thay đổi ở đây hiện ra ngay ngoài cửa hàng.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
