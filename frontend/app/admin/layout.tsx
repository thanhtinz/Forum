'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Sparkles, ShieldAlert, Users, Lock, Wrench, Sprout, Store, Settings } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const NAV = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/fortune', label: 'Bói toán & AI', icon: Sparkles },
  { href: '/admin/marketplace', label: 'Danh mục chợ', icon: Store },
  { href: '/admin/tools', label: 'Công cụ', icon: Wrench },
  { href: '/admin/templates', label: 'Dữ liệu game', icon: Sprout },
  { href: '/admin/moderation', label: 'Kiểm duyệt', icon: ShieldAlert },
  { href: '/admin/prison', label: 'Nhà tù', icon: Lock },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/settings', label: 'Cấu hình', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user || user.role !== 'ADMIN') {
    return <div className="card p-10 text-center text-ink-500">Khu vực quản trị — chỉ dành cho Admin.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="card h-fit p-2">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Quản trị</div>
        <nav className="space-y-0.5">
          {NAV.map((n) => {
            const active = path === n.href;
            return (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}`}>
                <n.icon size={16} /> {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div>{children}</div>
    </div>
  );
}
