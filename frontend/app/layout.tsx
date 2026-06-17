import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Header } from '@/components/Header';

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
          <Header />
          <main className="container-forum py-5">{children}</main>
          <footer className="border-t border-ink-200/70 py-8 text-center text-sm text-ink-500 dark:border-ink-800">
            © {new Date().getFullYear()} ForumHub · NestJS + Next.js
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
