import Link from 'next/link';
import { Search, Bell, Coins, LayoutGrid, MessagesSquare, Crown } from 'lucide-react';
import { auth } from '@/lib/auth';
import { fmtCount } from '@/lib/utils';

const NAV = [
  { href: '/', label: 'Trang chủ', icon: LayoutGrid },
  { href: '/forum', label: 'Diễn đàn', icon: MessagesSquare },
  { href: '/vip', label: 'VIP', icon: Crown },
];

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
      <div className="container-nova flex h-14 items-center gap-4">
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

        <div className="relative ml-auto hidden max-w-sm flex-1 items-center md:flex">
          <Search size={16} className="absolute left-3 text-ink-400" />
          <form action="/search" className="w-full">
            <input name="q" placeholder="Tìm bài viết, chủ đề, thành viên…"
              className="w-full rounded-full border border-ink-200 bg-ink-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white dark:border-ink-700 dark:bg-ink-900" />
          </form>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-600 sm:flex dark:bg-amber-950/40">
                <Coins size={13} /> {fmtCount(user.points)}
              </span>
              <Link href="/user/notifications" className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
                <Bell size={18} />
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
