'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Sparkles, ShieldAlert, Users, Sprout, CreditCard, Settings, FileText, Ticket,
  Award, BadgeCheck, CalendarCheck, Paperclip, Mail, ShieldCheck, KeyRound,
  BellRing, FolderTree, Sticker, ArrowLeft, LogOut, Menu, X, ChevronRight, Gift, Square, Megaphone, MessageCircle, Tv, SlidersHorizontal, BookOpen, Tag,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useSiteConfig } from '@/lib/siteConfig';
import { api } from '@/lib/api';

const NAV_GROUPS: { title: string; items: { href: string; label: string; icon: any }[] }[] = [
  {
    title: 'Tổng quan',
    items: [{ href: '/admin', label: 'Bảng điều khiển', icon: LayoutDashboard }],
  },
  {
    title: 'Nội dung',
    items: [
      { href: '/admin/forum-categories', label: 'Danh mục diễn đàn', icon: FolderTree },
      { href: '/admin/pages', label: 'Trang & Menu', icon: FileText },
      { href: '/admin/moderation', label: 'Kiểm duyệt', icon: ShieldAlert },
      { href: '/admin/scam', label: 'Tố cáo scam', icon: ShieldAlert },
      { href: '/admin/anime', label: 'Hoạt hình (Donghua)', icon: Tv },
      { href: '/admin/comic', label: 'Truyện tranh', icon: BookOpen },
      { href: '/admin/genres', label: 'Thể loại', icon: Tag },
      { href: '/admin/manga-creator', label: 'Duyệt truyện UGC', icon: BookOpen },
    ],
  },
  {
    title: 'Game & Giải trí',
    items: [
      { href: '/admin/templates', label: 'Dữ liệu game', icon: Sprout },
      { href: '/admin/fortune', label: 'Bói toán', icon: Sparkles },
      { href: '/admin/checkin', label: 'Điểm danh', icon: CalendarCheck },
      { href: '/admin/giftcode', label: 'Giftcode', icon: Gift },
      { href: '/admin/stickers', label: 'Sticker chat', icon: Sticker },
      { href: '/admin/avatars', label: 'Thư viện avatar', icon: Sticker },
      { href: '/admin/frames', label: 'Khung avatar', icon: Square },
      { href: '/admin/shop-badges', label: 'Badge trang trí', icon: Award },
      { href: '/admin/name-effects', label: 'Hiệu ứng tên', icon: Sparkles },
      { href: '/admin/chat-bubbles', label: 'Bong bóng chat', icon: MessageCircle },
      { href: '/admin/banners', label: 'Banner quảng cáo', icon: Megaphone },
    ],
  },
  {
    title: 'Thương mại',
    items: [{ href: '/admin/payments', label: 'Nạp tiền', icon: CreditCard }],
  },
  {
    title: 'Thành viên',
    items: [
      { href: '/admin/users', label: 'Người dùng', icon: Users },
      { href: '/admin/groups', label: 'Nhóm & Quyền', icon: KeyRound },
      { href: '/admin/verification', label: 'Xác minh', icon: BadgeCheck },
      { href: '/admin/badges', label: 'Huy hiệu', icon: Award },
      { href: '/admin/invites', label: 'Mã mời', icon: Ticket },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/admin/attachment', label: 'Lưu trữ ảnh & tệp (R2)', icon: Paperclip },
      { href: '/admin/mail', label: 'Email / SMTP', icon: Mail },
      { href: '/admin/push', label: 'Web Push', icon: BellRing },
      { href: '/admin/security', label: 'Chống spam', icon: ShieldCheck },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const cfg = useSiteConfig();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [groupKey, setGroupKey] = useState('');
  const [cfgGroups, setCfgGroups] = useState<{ key: string; name: string }[]>([]);

  useEffect(() => { setGroupKey(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('group') || '' : ''); }, [path]);
  useEffect(() => {
    if (user?.role === 'ADMIN') api.get<{ key: string; name: string }[]>('/admin/config').then(setCfgGroups).catch(() => {});
  }, [user]);

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user || user.role !== 'ADMIN') {
    return <div className="m-6 rounded-2xl border border-ink-200/70 bg-white p-10 text-center text-ink-500 dark:border-ink-800 dark:bg-ink-900">Khu vực quản trị — chỉ dành cho Admin.</div>;
  }

  const current = ALL_ITEMS.find((i) => i.href === path) || (path?.startsWith('/admin/config') ? { label: 'Cấu hình' } : null);

  const SidebarNav = (
    <nav className="space-y-5">
      {NAV_GROUPS.map((g) => (
        <div key={g.title}>
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">{g.title}</div>
          <div className="space-y-0.5">
            {g.items.map((n) => {
              const active = path === n.href;
              return (
                <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
                  className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-brand-600 font-medium text-white shadow-sm' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}`}>
                  <n.icon size={17} className={active ? '' : 'text-ink-400 group-hover:text-ink-600 dark:group-hover:text-ink-200'} />
                  <span className="flex-1 truncate">{n.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Cấu hình — mỗi nhóm là 1 mục riêng (không phải bấm vào danh sách) */}
      {cfgGroups.length > 0 && (
        <div>
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">Cấu hình</div>
          <div className="space-y-0.5">
            {cfgGroups.map((g) => {
              const active = path === '/admin/config' && groupKey === g.key;
              return (
                <Link key={g.key} href={`/admin/config?group=${g.key}`} onClick={() => { setOpen(false); setGroupKey(g.key); }}
                  className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${active ? 'bg-brand-600 font-medium text-white shadow-sm' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}`}>
                  <SlidersHorizontal size={17} className={active ? '' : 'text-ink-400 group-hover:text-ink-600 dark:group-hover:text-ink-200'} />
                  <span className="flex-1 truncate">{g.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-ink-100/60 dark:bg-ink-950">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-ink-800/80 bg-gradient-to-r from-ink-900 to-ink-800 px-4 text-white">
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-1.5 hover:bg-white/10 lg:hidden"><Menu size={20} /></button>
        <Link href="/admin" className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm shadow">⚙</span>
          <span className="hidden sm:block">Quản trị</span>
        </Link>
        {current && (
          <span className="hidden items-center gap-1.5 text-sm text-white/60 md:flex">
            <ChevronRight size={14} /> <span className="text-white/90">{current.label}</span>
          </span>
        )}
        <div className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/" className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-white/85 hover:bg-white/10"><ArrowLeft size={15} /> <span className="hidden sm:inline">Trang chủ</span></Link>
          <span className="hidden items-center gap-2 rounded-lg px-2 py-1 text-white/70 md:flex">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-[11px] font-bold">{(user.displayName || user.username || '?').slice(0, 1).toUpperCase()}</span>
            {user.displayName || user.username}
          </span>
          <button onClick={logout} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-white/85 hover:bg-white/10"><LogOut size={15} /> <span className="hidden sm:inline">Đăng xuất</span></button>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto flex w-full max-w-[1440px] flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20 rounded-2xl border border-ink-200/70 bg-white p-3 shadow-sm dark:border-ink-800 dark:bg-ink-900">{SidebarNav}</div>
        </aside>
        <div className="min-w-0 flex-1 space-y-5">{children}</div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white p-3 shadow-xl dark:bg-ink-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-semibold">Quản trị</span>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-ink-800"><X size={18} /></button>
            </div>
            {SidebarNav}
          </div>
        </div>
      )}

      <footer className="border-t border-ink-200/70 py-4 text-center text-xs text-ink-400 dark:border-ink-800">
        Trang quản trị · {cfg.name}
      </footer>
    </div>
  );
}
