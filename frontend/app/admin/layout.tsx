'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard, Sparkles, ShieldAlert, Users, Sprout, CreditCard, Settings, FileText, Ticket,
  BadgeInfo, Award, BadgeCheck, CalendarCheck, Paperclip, Mail, ShieldCheck, KeyRound,
  BellRing, Gavel, FolderTree, Sticker, ArrowLeft, LogOut, Menu, X, ChevronRight, Gift, Square, Megaphone,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

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
      { href: '/admin/disputes', label: 'Tranh chấp', icon: Gavel },
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
      { href: '/admin/profile-fields', label: 'Trường hồ sơ', icon: BadgeInfo },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/admin/attachment', label: 'Lưu trữ ảnh & tệp (R2)', icon: Paperclip },
      { href: '/admin/mail', label: 'Email / SMTP', icon: Mail },
      { href: '/admin/push', label: 'Web Push', icon: BellRing },
      { href: '/admin/security', label: 'Chống spam', icon: ShieldCheck },
      { href: '/admin/settings', label: 'Cấu hình hệ thống', icon: Settings },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);

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
        Trang quản trị · ForumHub
      </footer>
    </div>
  );
}
