'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { SiteFooter } from './SiteFooter';
import { FloatingDockBar } from './FloatingDockBar';
import { CookieConsent } from './CookieConsent';

// Bọc nội dung bằng Header + footer của forum, TRỪ khu /admin (admin có shell riêng)
export function ForumChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path?.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main className="container-forum flex-1 py-5">{children}</main>
      <SiteFooter />
      <FloatingDockBar />
      <CookieConsent />
    </div>
  );
}
