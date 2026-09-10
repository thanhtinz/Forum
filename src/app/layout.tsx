import type { Metadata, Viewport } from 'next';
import './globals.css';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { ThanhBen } from '@/components/vo/ThanhBen';
import { ThanhTren } from '@/components/vo/ThanhTren';
import { ThanhDay } from '@/components/vo/ThanhDay';

export const metadata: Metadata = {
  title: { default: 'Nova — kho game Java, Android, iOS', template: '%s · Nova' },
  description: 'Tải game về máy, kèm mã kiểm tra để đối chiếu, và bàn luận cùng người chơi khác ngay trong trang của từng game.',
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  // Cho phóng to: khoá lại là chặn đường người mắt kém, mà trang này đầy chữ
  // nhỏ (dung lượng, mã kiểm tra) — đúng thứ người ta hay phải phóng lên xem.
  maximumScale: 5,
};

/*
 * Đoạn mã đặt nền, chạy TRƯỚC khi trang vẽ ra.
 *
 * Để React đặt nền sau khi tải xong thì người chọn nền tối sẽ thấy một nháy
 * trắng giữa mặt mỗi lần mở trang. Đoạn này đồng bộ, nằm ngay đầu <head>, nên
 * nền đúng ngay từ khung hình đầu tiên.
 */
const DAT_NEN = `try{if(localStorage.getItem('nova:nen')==='toi')document.documentElement.dataset.nen='toi'}catch(e){}`;

export default async function BoCucGoc({ children }: { children: React.ReactNode }) {
  const nguoi = await nguoiHienTai();

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: DAT_NEN }} />
      </head>
      <body>
        <a href="#noi-dung" className="nhay-toi-noi-dung">Tới nội dung chính</a>
        <ThanhBen nguoi={nguoi} />

        {/*
          `lg:pl-[240px]` chừa đúng bề ngang thanh bên. `pb-20` ở khổ nhỏ chừa
          chỗ cho thanh tab đáy — thiếu nó thì đoạn cuối mọi trang bị nó che.
        */}
        <div className="min-h-screen pb-20 lg:pb-0 lg:pl-[240px]">
          <ThanhTren nguoi={nguoi} />
          <main id="noi-dung" className="khung py-5 sm:py-6">{children}</main>
        </div>

        <ThanhDay daDangNhap={!!nguoi} />
      </body>
    </html>
  );
}
