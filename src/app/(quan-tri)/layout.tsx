import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import '../globals.css';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { demViecTonDong } from '@/lib/quan-tri-dem';
import { ThanhBenQuanTri } from '@/components/quan-tri/ThanhBenQuanTri';
import { MenuQuanTri } from '@/components/quan-tri/MenuQuanTri';

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
 * nói chuyện với người đi mua hàng, còn ở đây là người coi kho.
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
  const nguoi = await nguoiHienTai();
  if (!nguoi) redirect('/dang-nhap');
  if (nguoi.vaiTro !== 'QUAN_TRI') redirect('/');

  const dem = await demViecTonDong();

  return (
    <html lang="vi">
      <body className="bg-nen3">
        <a href="#noi-dung" className="nhay-toi-noi-dung">Tới nội dung chính</a>

        {/*
          THANH BÊN ĐỨNG YÊN, nền sẫm — chỉ từ `lg` trở lên.

          Cố ý trông khác hẳn mặt tiền: người vừa sửa xong một game rồi mở tab
          mới phải biết ngay mình đang đứng ở đâu, mà cách nhanh nhất để biết
          là cả trang đổi màu — nhanh hơn đọc một dòng chữ.
        */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col bg-chu px-3 py-4 lg:flex">
          <Link href="/quan-tri" className="px-3 pb-5 text-[15px] font-bold tracking-tight text-nen">
            SunnyStore <span className="font-normal text-nen/55">Quản trị</span>
          </Link>

          <div className="flex-1 overflow-y-auto">
            <ThanhBenQuanTri dem={dem} />
          </div>

          <div className="space-y-1 border-t border-nen/10 px-3 pt-3 text-[12px]">
            <p className="truncate font-semibold text-nen/80">{nguoi.tenHienThi}</p>
            {/* Mở tab mới: đang sửa dở một game mà bấm nhầm rồi mất hết chữ
                đang gõ là chuyện không nên xảy ra. */}
            <a href="/" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-nen/55 hover:text-nen">
              Xem cửa hàng <ExternalLink size={12} aria-hidden />
            </a>
          </div>
        </aside>

        {/* Khổ nhỏ không có chỗ cho cột đứng, nên rơi về một thanh ngang. */}
        <header className="sticky top-0 z-40 bg-chu lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <Link href="/quan-tri" className="text-[14px] font-bold tracking-tight text-nen">
              SunnyStore <span className="font-normal text-nen/55">Quản trị</span>
            </Link>
            <a href="/" target="_blank" rel="noreferrer"
              className="ml-auto text-[12px] font-semibold text-nen/55">
              Xem cửa hàng
            </a>
          </div>
          <MenuQuanTri dem={dem} />
        </header>

        <div className="lg:pl-[228px]">
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
