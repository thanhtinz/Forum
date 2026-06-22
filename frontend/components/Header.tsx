'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { api, getToken } from '@/lib/api';
import {
  Search, Bell, Menu, Sun, Moon, MessageSquare, Gamepad2,
  ImagePlus, LogOut, User as UserIcon, ChevronDown, Moon as MoonIcon, Gem, ShieldAlert, Globe, Wrench, Ruler, X, LineChart, Tv,
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import { WalletChips } from './WalletChips';
import { useSiteConfig } from '@/lib/siteConfig';
import { WeatherMenu } from './WeatherMenu';

// Icon kiểu Messenger cho mục Chat
function MessengerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.99-.88c.17-.07.36-.09.54-.04.91.25 1.86.38 2.79.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2zm6.05 7.46l-2.94 4.66c-.47.74-1.47.93-2.18.41l-2.34-1.75a.46.46 0 0 0-.55 0l-3.16 2.4c-.42.32-.97-.18-.69-.62l2.94-4.66c.47-.74 1.47-.93 2.18-.41l2.34 1.75c.16.12.39.12.55 0l3.16-2.4c.42-.32.97.18.69.62z"/>
    </svg>
  );
}

const NAV = [
  { href: '/chat', label: 'Chat', icon: MessengerIcon },
  { href: '/anime', label: 'Anime', icon: Tv },
  { href: '/cong-game', label: 'Giải trí', icon: Gamepad2 },
  { href: '/fortune', label: 'Bói toán', icon: MoonIcon },
  { href: '/scam', label: 'Tố cáo scam', icon: ShieldAlert },
];

// Nhóm tiện ích gom vào dropdown
const UTILS = [
  { href: '/market', label: 'Live Market', icon: LineChart },
  { href: '/tools', label: 'Up ảnh', icon: ImagePlus },
  { href: '/netcheck', label: 'Công cụ mạng', icon: Globe },
  { href: '/converter', label: 'Đổi đơn vị', icon: Ruler },
];

export function Header() {
  const { user, logout } = useAuth();
  const cfg = useSiteConfig();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [menu, setMenu] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [utilOpen, setUtilOpen] = useState(false);
  const [forumOpen, setForumOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
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
    <header className="sticky top-0 z-50 border-b border-ink-200/70 bg-brand-700 text-white shadow-sm dark:border-ink-800 dark:bg-ink-900">
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
          {/* Logo nhỏ (thu gọn) — thay icon hình thoi nếu admin đã tải logo nhỏ */}
          {cfg.logoSmall
            ? <img src={cfg.logoSmall} alt={cfg.name} className="h-11 w-11 shrink-0 rounded-lg object-contain" />
            : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/15 text-2xl">◆</span>}
          {/* Logo dài: dùng ảnh logo nếu admin đã cấu hình, nếu không thì tên site */}
          {cfg.logo
            ? <img src={cfg.logo} alt={cfg.name} className="hidden h-11 w-auto max-w-[200px] object-contain sm:block" />
            : <span className="hidden text-lg sm:block">{cfg.name || <>Forum<span className="text-brand-200">Hub</span></>}</span>}
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {/* Diễn đàn — dropdown kiểu XenForo */}
          <div className="relative" onMouseLeave={() => setForumOpen(false)}>
            <button onClick={() => setForumOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
              <MessageSquare size={16} /> Diễn đàn <ChevronDown size={13} />
            </button>
            {forumOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl bg-white py-1 text-ink-700 shadow-lg dark:bg-ink-800 dark:text-ink-200">
                <Link href="/" onClick={() => setForumOpen(false)} className="block px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">Tất cả diễn đàn</Link>
                <Link href="/feed" onClick={() => setForumOpen(false)} className="block px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">Bài viết mới</Link>
                <div className="my-1 border-t border-ink-200/70 dark:border-ink-700" />
                <p className="px-4 pb-0.5 pt-1 text-xs font-semibold text-ink-400">Quan tâm</p>
                <Link href="/subscriptions" onClick={() => setForumOpen(false)} className="block px-4 py-2 pl-6 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">Chủ đề quan tâm</Link>
                <Link href="/tags" onClick={() => setForumOpen(false)} className="block px-4 py-2 pl-6 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">Diễn đàn quan tâm</Link>
              </div>
            )}
          </div>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
              <n.icon size={16} /> {n.label}
            </Link>
          ))}
          {/* Tiện ích — dropdown */}
          <div className="relative" onMouseLeave={() => setUtilOpen(false)}>
            <button onClick={() => setUtilOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
              <Wrench size={16} /> Tiện ích <ChevronDown size={13} />
            </button>
            {utilOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl bg-white py-1 text-ink-700 shadow-lg dark:bg-ink-800 dark:text-ink-200">
                {UTILS.map((u) => (
                  <Link key={u.href} href={u.href} onClick={() => setUtilOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-700">
                    <u.icon size={15} /> {u.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <form onSubmit={onSearch} className="ml-auto hidden flex-1 max-w-xs items-center sm:flex">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm..."
              className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/60 outline-none focus:bg-white/15" />
          </div>
        </form>

        {/* Thời tiết hiện tại (luôn hiện) + dropdown dự báo — cạnh ô tìm kiếm */}
        <div className="hidden lg:block"><WeatherMenu /></div>

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
                    <Gem size={15} /> Ví của tôi
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
        <div className="fixed inset-0 z-[60] md:hidden" onClick={() => setNavOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <nav onClick={(e) => e.stopPropagation()}
            className="drawer-left absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col overflow-y-auto bg-brand-700 px-3 pb-4 pt-3 shadow-2xl dark:bg-ink-900">
            <div className="mb-2 flex items-start justify-between gap-2">
              <Link href="/" onClick={() => setNavOpen(false)} className="flex min-w-0 flex-1 items-center gap-2 font-bold text-white">
                {cfg.logo ? (
                  // Có logo lớn → hiện thật to & rõ, bỏ icon hình thoi
                  <img src={cfg.logo} alt={cfg.name} className="h-24 w-auto max-w-full object-contain" />
                ) : (
                  <>
                    {cfg.logoSmall
                      ? <img src={cfg.logoSmall} alt={cfg.name} className="h-14 w-14 rounded-lg object-contain" />
                      : <span className="grid h-14 w-14 place-items-center rounded-lg bg-white/15 text-3xl">◆</span>}
                    <span className="text-lg">{cfg.name || 'ForumHub'}</span>
                  </>
                )}
              </Link>
              <button onClick={() => setNavOpen(false)} className="shrink-0 rounded-lg p-1.5 text-white/85 hover:bg-white/10"><X size={18} /></button>
            </div>

            <form onSubmit={(e) => { onSearch(e); setNavOpen(false); }} className="my-2 sm:hidden">
            <div className="relative w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm kiếm..."
                className="w-full rounded-lg border border-white/20 bg-white/10 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/60 outline-none focus:bg-white/15" />
            </div>
          </form>
          {/* Thời tiết — ngay dưới ô tìm kiếm */}
          <div className="mb-2"><WeatherMenu mobile /></div>
          <div className="flex flex-col gap-1">
            {/* Diễn đàn — nhóm thu gọn kiểu XenForo */}
            <button onClick={() => setForumOpen((o) => !o)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
              <span className="flex items-center gap-2"><MessageSquare size={16} /> Diễn đàn</span>
              <ChevronDown size={15} className={`transition ${forumOpen ? 'rotate-180' : ''}`} />
            </button>
            {forumOpen && (
              <div className="ml-3 flex flex-col gap-1 border-l border-white/15 pl-2">
                <Link href="/" onClick={() => setNavOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">Tất cả diễn đàn</Link>
                <Link href="/feed" onClick={() => setNavOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">Bài viết mới</Link>
                <p className="px-3 pt-1 text-xs font-semibold text-white/55">Quan tâm</p>
                <Link href="/subscriptions" onClick={() => setNavOpen(false)} className="rounded-lg px-3 py-2 pl-5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">Chủ đề quan tâm</Link>
                <Link href="/tags" onClick={() => setNavOpen(false)} className="rounded-lg px-3 py-2 pl-5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">Diễn đàn quan tâm</Link>
              </div>
            )}
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setNavOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
                <n.icon size={16} /> {n.label}
              </Link>
            ))}
            {/* Tiện ích — thu gọn được trên mobile */}
            <button onClick={() => setUtilOpen((o) => !o)}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
              <span className="flex items-center gap-2"><Wrench size={16} /> Tiện ích</span>
              <ChevronDown size={15} className={`transition ${utilOpen ? 'rotate-180' : ''}`} />
            </button>
            {utilOpen && (
              <div className="ml-3 flex flex-col gap-1 border-l border-white/15 pl-2">
                {UTILS.map((u) => (
                  <Link key={u.href} href={u.href} onClick={() => setNavOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
                    <u.icon size={16} /> {u.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          </nav>
        </div>
      )}

    </header>
  );
}

export function Avatar({ user, size = 32 }: { user: { username: string; avatar?: string | null; avatarFrameUrl?: string | null }; size?: number }) {
  const inner = user.avatar
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={user.avatar} alt={user.username} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
    : <span className="grid place-items-center rounded-full bg-brand-500 font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.42 }}>{user.username?.[0]?.toUpperCase() || '?'}</span>;
  if (!user.avatarFrameUrl) return inner;
  // Khung avatar — vẽ chồng lên, lớn hơn ~38% để bao quanh ảnh
  const fs = Math.round(size * 1.4);
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {inner}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={user.avatarFrameUrl} alt="" aria-hidden draggable={false}
        className="pointer-events-none absolute select-none object-contain" style={{ width: fs, height: fs, maxWidth: 'none' }} />
    </span>
  );
}
