'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Bell, Menu, Sun, Moon, MessageSquare, Gamepad2,
  Store, Wrench, Sparkles, LogOut, User as UserIcon, ChevronDown,
} from 'lucide-react';
import { useAuth } from './AuthProvider';

const NAV = [
  { href: '/', label: 'Diễn đàn', icon: MessageSquare },
  { href: '/chat', label: 'Chat', icon: Bell },
  { href: '/game', label: 'Game', icon: Gamepad2 },
  { href: '/marketplace', label: 'Chợ', icon: Store },
  { href: '/fortune', label: 'Bói toán', icon: Sparkles },
  { href: '/ai', label: 'AI Companion', icon: Sparkles },
  { href: '/tools', label: 'Công cụ', icon: Wrench },
];

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const [dark, setDark] = useState(false);

  function toggleTheme() {
    const el = document.documentElement;
    el.classList.toggle('dark');
    setDark(el.classList.contains('dark'));
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-brand-700 text-white shadow-sm dark:border-ink-800 dark:bg-ink-900">
      <div className="container-forum flex h-14 items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 text-lg">◆</span>
          <span className="hidden sm:block text-lg">Forum<span className="text-brand-200">Hub</span></span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
              <n.icon size={16} /> {n.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden flex-1 max-w-xs items-center sm:flex">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm..."
              className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/60 outline-none focus:bg-white/15" />
          </div>
        </form>

        <button onClick={toggleTheme} className="rounded-lg p-2 text-white/85 hover:bg-white/10" aria-label="theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        {user && (
          <Link href="/notifications" className="rounded-lg p-2 text-white/85 hover:bg-white/10" aria-label="notifications">
            <Bell size={18} />
          </Link>
        )}

        {user ? (
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)}
              className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-white/10">
              <Avatar user={user} size={28} />
              <span className="hidden text-sm font-medium sm:block">{user.displayName || user.username}</span>
              <ChevronDown size={14} />
            </button>
            {menu && (
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl bg-white py-1 text-ink-700 shadow-lg dark:bg-ink-800 dark:text-ink-200">
                <Link href={`/profile?u=${user.username}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">
                  <UserIcon size={15} /> Trang cá nhân
                </Link>
                <Link href="/orders" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">
                  <Store size={15} /> Đơn hàng của tôi
                </Link>
                <Link href="/seller" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">
                  <Store size={15} /> Seller Center
                </Link>
                {user.role === 'ADMIN' && (
                  <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">
                    <UserIcon size={15} /> Trang quản trị
                  </Link>
                )}
                <button onClick={() => { logout(); setMenu(false); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-ink-100 dark:hover:bg-ink-700">
                  <LogOut size={15} /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10">Đăng nhập</Link>
            <Link href="/register" className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Đăng ký</Link>
          </div>
        )}
      </div>
    </header>
  );
}

export function Avatar({ user, size = 32 }: { user: { username: string; avatar?: string | null }; size?: number }) {
  if (user.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatar} alt={user.username} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const letter = user.username?.[0]?.toUpperCase() || '?';
  return (
    <span className="grid place-items-center rounded-full bg-brand-500 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {letter}
    </span>
  );
}
