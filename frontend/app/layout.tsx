import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { ForumChrome } from '@/components/ForumChrome';

const SITE = 'Forum AI Platform';
const DESC = 'Diễn đàn cộng đồng tích hợp game, chợ số, AI Live2D — phong cách XenForo/Flarum.';

export const metadata: Metadata = {
  title: { default: `${SITE} — Diễn đàn cộng đồng`, template: `%s · ${SITE}` },
  description: DESC,
  applicationName: SITE,
  openGraph: { title: SITE, description: DESC, type: 'website', siteName: SITE },
  twitter: { card: 'summary_large_image', title: SITE, description: DESC },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <ForumChrome>{children}</ForumChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
