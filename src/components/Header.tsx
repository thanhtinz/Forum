import Link from 'next/link';
import { Search, Bell, PenLine, ChevronDown } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { touchPresence } from '@/lib/presence';
import { getLevelLook } from '@/lib/level';
import { getNavItems } from '@/lib/nav';
import { getSiteSettings } from '@/lib/site';
import { IconGlyph } from './IconGlyph';
import { MobileNav } from './MobileNav';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

export async function Header() {
  const session = await auth();
  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;
  const unread = user?.id ? await db.notification.count({ where: { userId: user.id, read: false } }) : 0;
  if (user?.id) await touchPresence(user.id);
  const levelLook = user?.id ? await getLevelLook(user.level ?? 1) : null;
  const [nav, site] = await Promise.all([getNavItems('header'), getSiteSettings()]);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/90 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90">
      <div className="container-nova flex h-14 items-center gap-2">
        <MobileNav nav={nav} loggedIn={!!user} siteName={site.name} siteLogo={site.logo} />

        <Link href="/" className="flex shrink-0 items-center gap-2" title={site.tagline || site.name}>
          <span className="grid size-8 place-items-center overflow-hidden rounded-xl bg-brand-500 text-lg font-black text-white">
            <IconGlyph icon={site.logo} fallback={site.name.charAt(0).toUpperCase()} className="size-full" />
          </span>
          <span className="text-lg font-black tracking-tight">{site.name}</span>
        </Link>

        <nav className="hidden items-center lg:flex">
          {nav.map((n) => (
            n.children.length > 0 ? (
              // Mục có con: mở bằng hover/focus, không cần JS
              <div key={n.id} className="group relative">
                <Link href={n.url}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800">
                  <IconGlyph icon={n.icon} className="text-base" /> {n.label}
                  <ChevronDown size={13} className="text-ink-400" />
                </Link>
                <div className="invisible absolute left-0 top-full z-50 min-w-44 rounded-xl border border-ink-200 bg-white p-1 opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 dark:border-ink-700 dark:bg-ink-900">
                  {n.children.map((c) => (
                    <Link key={c.id} href={c.url}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-ink-600 hover:bg-ink-100 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800">
                      <IconGlyph icon={c.icon} className="text-base" /> {c.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={n.id} href={n.url}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800">
                <IconGlyph icon={n.icon} className="text-base" /> {n.label}
              </Link>
            )
          ))}
        </nav>

        {/* Tìm kiếm — chiếm phần còn lại, thu nhỏ dần thay vì đẩy các nút đi */}
        <form action="/search" className="relative ml-auto hidden min-w-0 flex-1 md:block lg:ml-4 lg:max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input name="q" placeholder="Tìm kiếm…"
            className="w-full rounded-full border border-ink-200 bg-ink-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white dark:border-ink-700 dark:bg-ink-900" />
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-2">
          <Link href="/search" title="Tìm kiếm"
            className="grid size-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100 md:hidden dark:hover:bg-ink-800">
            <Search size={18} />
          </Link>
          <ThemeToggle />

          {user ? (
            <>
              <Link href="/user/write" className="btn-primary hidden !px-3 !py-1.5 text-sm sm:inline-flex">
                <PenLine size={15} /> Đăng bài
              </Link>
              <Link href="/user/notifications" title="Thông báo"
                className="relative grid size-9 place-items-center rounded-full text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800">
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
              <UserMenu
                name={user.name ?? 'Bạn'}
                image={user.image ?? null}
                points={user.points ?? 0}
                balance={user.balance ?? 0}
                level={user.level ?? 1}
                levelIcon={levelLook?.icon}
                levelColor={levelLook?.color}
                levelName={levelLook?.name}
                vipTier={user.vipTier ?? null}
                isStaff={role === 'ADMIN' || role === 'MODERATOR'}
              />
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
