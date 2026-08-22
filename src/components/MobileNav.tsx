'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Search, LayoutGrid, MessagesSquare, Crown, Gamepad2, LayoutDashboard, LogIn, UserPlus, PenLine, Settings, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = { LayoutGrid, MessagesSquare, Crown, Gamepad2, ShoppingBag } as const;

export interface MobileNavProps {
  nav: { href: string; label: string; icon: keyof typeof ICONS }[];
  loggedIn: boolean;
}

export function MobileNav({ nav, loggedIn }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMounted(true); }, []);
  // Đóng menu khi chuyển trang
  useEffect(() => { setOpen(false); }, [pathname]);
  // Khoá cuộn nền khi mở
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Drawer render qua portal ra body để không bị header (backdrop-blur) "nhốt" phần tử fixed.
  const drawer = (
    <div className="md:hidden">
      {/* Overlay */}
      <div className={cn('fixed inset-0 z-[60] bg-black/40 transition-opacity', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={() => setOpen(false)} />

      {/* Panel trượt từ trái */}
      <div className={cn('fixed inset-y-0 left-0 z-[61] flex w-72 max-w-[82%] flex-col bg-white shadow-xl transition-transform dark:bg-ink-900',
        open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
          <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-lg font-black text-white">N</span>
            <span className="text-lg font-black">Nova</span>
          </Link>
          <button type="button" aria-label="Đóng" onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Tìm kiếm */}
          <form action="/search" className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="q" placeholder="Tìm kiếm…"
              className="w-full rounded-full border border-ink-200 bg-ink-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white dark:border-ink-700 dark:bg-ink-900" />
          </form>

          {/* Điều hướng */}
          <nav className="space-y-1">
            {nav.map((n) => {
              const Icon = ICONS[n.icon];
              return (
                <Link key={n.href} href={n.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-ink-700 hover:bg-ink-100 hover:text-brand-600 dark:text-ink-200 dark:hover:bg-ink-800">
                  <Icon size={18} /> {n.label}
                </Link>
              );
            })}
            {loggedIn && (
              <>
                <Link href="/user/write"
                  className="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-2.5 font-semibold text-brand-600 hover:bg-brand-100 dark:bg-brand-950/40">
                  <PenLine size={18} /> Đăng bài
                </Link>
                <Link href="/user/dashboard"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-ink-700 hover:bg-ink-100 hover:text-brand-600 dark:text-ink-200 dark:hover:bg-ink-800">
                  <LayoutDashboard size={18} /> Trang cá nhân
                </Link>
                <Link href="/user/settings"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-ink-700 hover:bg-ink-100 hover:text-brand-600 dark:text-ink-200 dark:hover:bg-ink-800">
                  <Settings size={18} /> Cài đặt
                </Link>
              </>
            )}
          </nav>
        </div>

        {!loggedIn && (
          <div className="grid grid-cols-2 gap-2 border-t border-ink-100 p-4 dark:border-ink-800">
            <Link href="/login" className="btn-outline"><LogIn size={16} /> Đăng nhập</Link>
            <Link href="/register" className="btn-primary"><UserPlus size={16} /> Đăng ký</Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="md:hidden">
      <button type="button" aria-label="Mở menu" onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800">
        <Menu size={22} />
      </button>
      {mounted && createPortal(drawer, document.body)}
    </div>
  );
}
