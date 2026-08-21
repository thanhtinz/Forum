'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, FolderTree, Users, Banknote, Flag, Crown, ShieldAlert, Gamepad2, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  { href: '/admin/posts', label: 'Bài viết', icon: FileText },
  { href: '/admin/categories', label: 'Chuyên mục', icon: FolderTree },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/reports', label: 'Báo cáo', icon: Flag },
  { href: '/admin/vip-plans', label: 'Gói VIP', icon: Crown },
  { href: '/admin/withdrawals', label: 'Rút tiền', icon: Banknote },
  { href: '/admin/games', label: 'Game', icon: Gamepad2 },
  { href: '/admin/emulator', label: 'Emulator', icon: Cpu },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="card flex gap-1 overflow-x-auto p-1.5 lg:sticky lg:top-[4.5rem] lg:flex-col">
      <div className="mb-1 hidden items-center gap-1.5 px-3 py-2 text-sm font-bold text-brand-600 lg:flex"><ShieldAlert size={16} /> Quản trị</div>
      {ITEMS.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link key={it.href} href={it.href}
            className={cn('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-brand-500 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800')}>
            <Icon size={16} /> {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
