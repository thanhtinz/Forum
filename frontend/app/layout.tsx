import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { ForumChrome } from '@/components/ForumChrome';
import { PwaRegister } from '@/components/PwaRegister';
import { SiteMeta } from '@/components/SiteMeta';

// Giá trị mặc định lúc build (static export). Tiêu đề/meta thực tế do <SiteMeta> cập nhật
// theo cấu hình admin (site.name…) ở phía client.
const SITE = 'Trạm GenZ';
const DESC = 'Cộng đồng anime, manga, hoạt hình — xem phim, đọc truyện, thảo luận tại Trạm GenZ.';

export const metadata: Metadata = {
  title: { default: `${SITE} — Diễn đàn cộng đồng`, template: `%s · ${SITE}` },
  description: DESC,
  applicationName: SITE,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: SITE },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
  openGraph: { title: SITE, description: DESC, type: 'website', siteName: SITE },
  twitter: { card: 'summary_large_image', title: SITE, description: DESC },
  robots: { index: true, follow: true },
};

// Chặn tự phóng to khi focus input trên iOS + màu thanh trạng thái khi cài app
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <SiteMeta />
        <AuthProvider>
          <ForumChrome>{children}</ForumChrome>
        </AuthProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
