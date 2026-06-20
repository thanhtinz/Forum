'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import {
  Search, Bell, Menu, Sun, Moon, MessageSquare, Gamepad2,
  Store, ImagePlus, Sparkles, LogOut, User as UserIcon, ChevronDown, Moon as MoonIcon, Gem, Package, TrendingUp, ShieldAlert,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { WalletChips } from './WalletChips';

// Icon kiểu Messenger cho mục Chat
function MessengerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.99-.88c.17-.07.36-.09.54-.04.91.25 1.86.38 2.79.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6.05 7.46l-2.94 4.66c-.47.74-1.47.93-2.18.41l-2.34-1.75a.46.46 0 0 0-.55 0l-3.16 2.4c-.42.32-.97-.18-.69-.62l2.94-4.66c.47-.74 1.47-.93 2.18-.41l2.34 1.75c.16.12.39.12.55 0l3.16-2.4c.42-.32.97.18.69.62z"/>
    </svg>
  );
}

const NAV = [
  { href: '/', label: 'Diễn đàn', icon: MessageSquare },
  { href: '/chat', label: 'Chat', icon: MessengerIcon },
  { href: '/cong-game', label: 'Cổng game', icon: Gamepad2 },
  { href: '/marketplace', label: 'Chợ', icon: Store },
  { href: '/fortune', label: 'Bói toán', icon: MoonIcon },
  { href: '/predictions', label: 'Cá cược', icon: TrendingUp },
  { href: '/ai', label: 'AI Companion', icon: Sparkles },
  { href: '/scam', label: 'Tố cáo scam', icon: ShieldAlert },
  { href: '/tools', label: 'Kho ảnh', icon: ImagePlus },
];

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hasStore, setHasStore] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setUnread(0); setHasStore(null); return; }
    api.get<{ hasStore: boolean }>('/marketplace/seller/my-store').then((r) => setHasStore(r.hasStore)).catch(() => setHasStore(null));
    api.get<{ meta: { unreadCount: number } }>('/notifications').then((r) => setUnread(r.meta.unreadCount)).catch(() => {});
    const base = process.env.NEXT_PUBLIC_API_URL || '';
    const s = io(`${base}/notif`, { auth: { token: getToken() }, transports: ['websocket', 'polling'] });
    s.on('notification', () => setUnread((n) => n + 1));
    return () => { s.disconnect(); };
  }, [user]);

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
        {/* Hamburger: mở menu trên màn hình nhỏ */}
        <button
          onClick={() => setNavOpen((o) => !o)}
          className="rounded-lg p-2 text-white/85 hover:bg-white/10 md:hidden"
          aria-label="menu"
        >
          <Menu size={20} />
        </button>

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

        {/* Cụm điều khiển: số dư + đổi theme, thông báo, tài khoản — đặt ở góc phải */}
        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <WalletChips />
          <button onClick={toggleTheme} className="rounded-lg p-2 text-white/85 hover:bg-white/10" aria-label="theme">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user && (
            <Link href="/notifications" onClick={() => setUnread(0)} className="relative rounded-lg p-2 text-white/85 hover:bg-white/10" aria-label="notifications">
              <Bell size={18} />
              {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
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
                  <Link href="/wallet" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">
                    <Gem size={15} /> Nạp Gem
                  </Link>
                  <Link href="/orders" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">
                    <Package size={15} /> Đơn hàng của tôi
                  </Link>
                  <Link href={hasStore === false ? '/seller/shop' : '/seller'} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">
                    <Store size={15} /> {hasStore === false ? 'Đăng ký bán hàng' : 'Seller Center'}
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
      </div>

      {/* Menu xổ xuống cho màn hình nhỏ */}
      {navOpen && (
        <nav className="border-t border-white/10 bg-brand-700 px-3 pb-3 pt-1 md:hidden dark:bg-ink-900">
          <form onSubmit={(e) => { onSearch(e); setNavOpen(false); }} className="my-2 sm:hidden">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm..."
                className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/60 outline-none focus:bg-white/15" />
            </div>
          </form>
          <div className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setNavOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
                <n.icon size={16} /> {n.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
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
