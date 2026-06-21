'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { SiteFooter } from './SiteFooter';
import { FloatingDockBar } from './FloatingDockBar';

// Bọc nội dung bằng Header + footer của forum, TRỪ khu /admin (admin có shell riêng)
export function ForumChrome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path?.startsWith('/admin');

  if (isAdmin) return <>{children}</>;

  return (
    <>
      <Header />
      <main className="container-forum py-5">{children}</main>
      <SiteFooter />
      <FloatingDockBar />
    </>
  );
}
