import Link from 'next/link';
import { Cpu, Gamepad2, Home, ShieldCheck } from 'lucide-react';
import { requireAdmin } from '@/lib/admin';

const NAV = [
  { href: '/admin/games', label: 'Quản lý game', icon: Gamepad2 },
  { href: '/admin/emulator', label: 'Quản lý emulator', icon: Cpu },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
        <div className="container-nova flex h-14 items-center gap-4">
          <Link href="/admin" className="flex items-center gap-2 font-black">
            <ShieldCheck size={20} className="text-brand-500" /> Nova Admin
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800">
                <n.icon size={16} /> <span className="hidden sm:inline">{n.label}</span>
              </Link>
            ))}
          </nav>
          <Link href="/" className="btn-ghost ml-auto !px-3 !py-1.5 text-sm">
            <Home size={15} /> <span className="hidden sm:inline">Về trang chủ</span>
          </Link>
        </div>
      </header>

      <main className="container-nova flex-1 py-5">{children}</main>
    </div>
  );
}
