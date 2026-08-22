import Link from 'next/link';
import { Search, Bell, Coins, LayoutGrid, MessagesSquare, Crown, PenLine, Gamepad2, ShieldAlert, ShoppingBag } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { fmtCount } from '@/lib/utils';
import { touchPresence } from '@/lib/presence';
import { MobileNav } from './MobileNav';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { href: '/', label: 'Diễn đàn', icon: MessagesSquare },
  { href: '/shop', label: 'Cửa hàng', icon: ShoppingBag },
  { href: '/blog', label: 'Bài viết', icon: LayoutGrid },
  { href: '/games', label: 'Game', icon: Gamepad2 },
  { href: '/vip', label: 'VIP', icon: Crown },
];

const NAV_MOBILE = [
  { href: '/', label: 'Diễn đàn', icon: 'MessagesSquare' as const },
  { href: '/shop', label: 'Cửa hàng', icon: 'ShoppingBag' as const },
  { href: '/blog', label: 'Bài viết', icon: 'LayoutGrid' as const },
  { href: '/games', label: 'Game', icon: 'Gamepad2' as const },
  { href: '/vip', label: 'VIP', icon: 'Crown' as const },
];

export async function Header() {
  const session = await auth();
  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;
  const unread = user?.id ? await db.notification.count({ where: { userId: user.id, read: false } }) : 0;
  if (user?.id) await touchPresence(user.id);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
      <div className="container-nova flex h-14 items-center gap-3 sm:gap-4">
        <MobileNav nav={NAV_MOBILE} loggedIn={!!user} />

        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500 text-lg font-black text-white">N</span>
          <span className="text-lg font-black tracking-tight">Nova</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800">
              <n.icon size={16} /> {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 justify-center px-4 md:flex">
          <form action="/search" className="relative w-full max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="q" placeholder="Tìm bài viết, chủ đề, thành viên…"
              className="w-full rounded-full border border-ink-200 bg-ink-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white dark:border-ink-700 dark:bg-ink-900" />
          </form>
        </div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/user/write" className="btn-primary hidden !px-3 !py-1.5 text-sm sm:inline-flex">
                <PenLine size={15} /> Đăng bài
              </Link>
              <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 sm:flex dark:bg-amber-950/40">
                <Coins size={13} /> {fmtCount(user.points)}
              </span>
              {(role === 'ADMIN' || role === 'MODERATOR') && (
                <Link href="/admin" title="Quản trị" className="hidden h-9 w-9 place-items-center rounded-full text-rose-500 hover:bg-rose-50 sm:grid dark:hover:bg-rose-950/40">
                  <ShieldAlert size={18} />
                </Link>
              )}
              <Link href="/user/notifications" className="relative grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
                <Bell size={18} />
                {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
              </Link>
              <Link href="/user/dashboard" className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {user.image
                  ? <img src={user.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                  : <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{(user.name ?? 'U')[0]?.toUpperCase()}</span>}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost !px-3 !py-1.5 text-sm">Đăng nhập</Link>
              <Link href="/register" className="btn-primary !px-3.5 !py-1.5 text-sm">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
