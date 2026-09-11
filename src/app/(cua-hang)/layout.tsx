import type { Metadata, Viewport } from 'next';
import '../globals.css';
import { nguoiHienTai } from '@/lib/xac-thuc';
import { demChuaDoc } from '@/lib/thong-bao';
import { ThanhBen } from '@/components/vo/ThanhBen';
import { ThanhTren } from '@/components/vo/ThanhTren';
import { ThanhDay } from '@/components/vo/ThanhDay';
import { DangKySW } from '@/components/vo/DangKySW';

export const metadata: Metadata = {
  title: { default: 'SunnyStore — trò chơi Java, Android, iOS', template: '%s · SunnyStore' },
  description: 'Tải game về máy, và bàn luận cùng người chơi khác ngay trong trang của từng game.',
  // Cho phép cài lên màn hình chính iPhone và hiện đúng tên dưới biểu tượng.
  appleWebApp: { capable: true, title: 'SunnyStore', statusBarStyle: 'default' },
  // Ảnh hiện ra khi ai đó dán liên kết trang này vào Zalo, Messenger, Facebook.
  openGraph: {
    type: 'website',
    siteName: 'SunnyStore',
    images: [{ url: '/anh-chia-se.png', width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  // Màu thanh trạng thái khi trang chạy dạng ứng dụng đã cài. Hai giá trị để
  // nền tối không bị một dải trắng chói ngay trên đỉnh màn hình.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1114' },
  ],
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
const DAT_NEN = `try{if(localStorage.getItem('sunny:nen')==='toi')document.documentElement.dataset.nen='toi'}catch(e){}`;

export default async function BoCucGoc({ children }: { children: React.ReactNode }) {
  const nguoi = await nguoiHienTai();
  // Đếm ở khung để mọi trang đều có con số trên chuông, khỏi phải nhớ truyền.
  const chuaDoc = nguoi ? await demChuaDoc(nguoi.id) : 0;

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
        {/* `pb-28` chừa chỗ cho thanh tab NỔI: nó cao hơn thanh dính đáy vì
            còn cộng thêm lề dưới. Thiếu chỗ chừa thì đoạn cuối mọi trang bị che. */}
        <div className="min-h-screen pb-28 lg:pb-0 lg:pl-[240px]">
          <ThanhTren nguoi={nguoi} chuaDoc={chuaDoc} />
          <main id="noi-dung" className="khung py-5 sm:py-6">{children}</main>
        </div>

        <ThanhDay />
        <DangKySW />
      </body>
    </html>
  );
}
