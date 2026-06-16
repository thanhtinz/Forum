import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'ForumHub — Diễn đàn cộng đồng',
  description: 'Diễn đàn + game + chợ source code, phong cách XenForo/Flarum.',
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
