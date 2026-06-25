'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, Sparkles, ShieldAlert, Users, Sprout, CreditCard, FileText, Ticket,
  Award, BadgeCheck, CalendarCheck, Paperclip, Mail, ShieldCheck, KeyRound,
  BellRing, FolderTree, Sticker, ArrowLeft, LogOut, Menu, X, ChevronDown, ChevronRight,
  Gift, Square, Megaphone, MessageCircle, Tv, SlidersHorizontal, BookOpen, Tag,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useSiteConfig } from '@/lib/siteConfig';
import { api } from '@/lib/api';

interface NavItem { href: string; label: string; icon: any }
interface NavGroup { title: string; color: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Tổng quan', color: 'text-sky-400',
    items: [{ href: '/admin', label: 'Bảng điều khiển', icon: LayoutDashboard }],
  },
  {
    title: 'Nội dung', color: 'text-emerald-400',
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
    title: 'Game & Giải trí', color: 'text-violet-400',
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
    title: 'Thương mại', color: 'text-amber-400',
    items: [{ href: '/admin/payments', label: 'Nạp tiền', icon: CreditCard }],
  },
  {
    title: 'Thành viên', color: 'text-rose-400',
    items: [
      { href: '/admin/users', label: 'Người dùng', icon: Users },
      { href: '/admin/groups', label: 'Nhóm & Quyền', icon: KeyRound },
      { href: '/admin/verification', label: 'Xác minh', icon: BadgeCheck },
      { href: '/admin/badges', label: 'Huy hiệu', icon: Award },
      { href: '/admin/invites', label: 'Mã mời', icon: Ticket },
    ],
  },
  {
    title: 'Hệ thống', color: 'text-slate-400',
    items: [
      { href: '/admin/attachment', label: 'Lưu trữ ảnh & tệp (R2)', icon: Paperclip },
      { href: '/admin/mail', label: 'Email / SMTP', icon: Mail },
      { href: '/admin/push', label: 'Web Push', icon: BellRing },
      { href: '/admin/security', label: 'Chống spam', icon: ShieldCheck },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function NavGroupSection({
  group, path, onNav, collapsed, onToggle,
}: {
  group: NavGroup; path: string; onNav: () => void; collapsed: boolean; onToggle: () => void;
}) {
  const hasActive = group.items.some((i) => i.href === path);
  return (
    <div>
      <button
        onClick={onToggle}
        className={`flex w-full items-center gap-2 px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest transition hover:bg-white/5 ${group.color}`}
      >
        <span className="flex-1">{group.title}</span>
        <ChevronDown size={12} className={`shrink-0 transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>
      {!collapsed && (
        <div className="pb-1">
          {group.items.map((n) => {
            const active = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={onNav}
                className={`group flex items-center gap-2.5 border-l-2 py-1.5 pl-5 pr-4 text-sm transition ${
                  active
                    ? 'border-sky-400 bg-white/10 font-semibold text-white'
                    : 'border-transparent text-slate-300 hover:border-slate-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <n.icon size={15} className={active ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'} />
                <span className="truncate">{n.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const cfg = useSiteConfig();
  const path = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [groupKey, setGroupKey] = useState('');
  const [cfgGroups, setCfgGroups] = useState<{ key: string; name: string }[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setGroupKey(typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('group') || '' : '');
  }, [path]);

  useEffect(() => {
    if (user?.role === 'ADMIN') api.get<{ key: string; name: string }[]>('/admin/config').then(setCfgGroups).catch(() => {});
  }, [user]);

  const toggleGroup = (title: string) => setCollapsed((c) => ({ ...c, [title]: !c[title] }));

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1923]">
      <div className="text-slate-400 text-sm">Đang tải…</div>
    </div>
  );
  if (!user || user.role !== 'ADMIN') return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1923]">
      <div className="rounded-xl border border-slate-700 bg-[#1a2535] p-10 text-center text-slate-300">
        Khu vực quản trị — chỉ dành cho Admin.
      </div>
    </div>
  );

  const current = ALL_ITEMS.find((i) => i.href === path) || (path?.startsWith('/admin/config') ? { label: 'Cấu hình' } : null);

  const SidebarContent = (
    <div className="flex h-full flex-col">
      {/* Sidebar branding */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-500 text-base font-bold text-white shadow">⚙</span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-white">{cfg.name}</div>
          <div className="text-[10px] text-slate-400">Admin Control Panel</div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
        {NAV_GROUPS.map((g) => (
          <NavGroupSection
            key={g.title}
            group={g}
            path={path}
            onNav={() => setDrawerOpen(false)}
            collapsed={!!collapsed[g.title]}
            onToggle={() => toggleGroup(g.title)}
          />
        ))}

        {cfgGroups.length > 0 && (
          <div>
            <button
              onClick={() => toggleGroup('__cfg')}
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-orange-400 transition hover:bg-white/5"
            >
              <span className="flex-1">Cấu hình</span>
              <ChevronDown size={12} className={`shrink-0 transition-transform ${collapsed['__cfg'] ? '-rotate-90' : ''}`} />
            </button>
            {!collapsed['__cfg'] && (
              <div className="pb-1">
                {cfgGroups.map((g) => {
                  const active = path === '/admin/config' && groupKey === g.key;
                  return (
                    <Link
                      key={g.key}
                      href={`/admin/config?group=${g.key}`}
                      onClick={() => { setDrawerOpen(false); setGroupKey(g.key); }}
                      className={`group flex items-center gap-2.5 border-l-2 py-1.5 pl-5 pr-4 text-sm transition ${
                        active
                          ? 'border-sky-400 bg-white/10 font-semibold text-white'
                          : 'border-transparent text-slate-300 hover:border-slate-500 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <SlidersHorizontal size={15} className={active ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'} />
                      <span className="truncate">{g.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sidebar footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sky-600 text-xs font-bold text-white">
            {(user.displayName || user.username || '?').slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-300">{user.displayName || user.username}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f2f5] dark:bg-[#0f1923]">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-white/5 bg-[#1a2535] px-4 shadow-lg">
        <button onClick={() => setDrawerOpen((o) => !o)} className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden">
          <Menu size={18} />
        </button>
        <div className="hidden items-center gap-1.5 text-sm text-slate-400 lg:flex">
          <Link href="/admin" className="text-white/80 hover:text-white">Admin</Link>
          {current && (
            <>
              <ChevronRight size={13} />
              <span className="text-slate-200">{current.label}</span>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/" className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white">
            <ArrowLeft size={13} /> Trang chủ
          </Link>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white">
            <LogOut size={13} /> Đăng xuất
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 bg-[#1a2535] lg:flex lg:flex-col">
          <div className="sticky top-12 h-[calc(100vh-3rem)] overflow-hidden">
            {SidebarContent}
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 p-5 lg:p-6">
          {children}
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 overflow-hidden bg-[#1a2535] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-12 items-center justify-between border-b border-white/10 px-4">
              <span className="text-sm font-semibold text-white">Menu quản trị</span>
              <button onClick={() => setDrawerOpen(false)} className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="h-[calc(100%-3rem)] overflow-y-auto">{SidebarContent}</div>
          </div>
        </div>
      )}
    </div>
  );
}
