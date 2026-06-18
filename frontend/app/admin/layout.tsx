'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Sparkles, ShieldAlert, Users, Lock, Wrench, Sprout, Store, CreditCard, Settings, FileText, Ticket, BadgeInfo, Award, BadgeCheck, CalendarCheck, Disc3, Gift, HelpCircle, ImagePlus, Paperclip, Mail, ShieldCheck, KeyRound, BellRing, Gavel, FolderTree, ArrowLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const NAV = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/fortune', label: 'Bói toán & AI', icon: Sparkles },
  { href: '/admin/forum-categories', label: 'Danh mục diễn đàn', icon: FolderTree },
  { href: '/admin/marketplace', label: 'Quản lý Chợ', icon: Store },
  { href: '/admin/payments', label: 'Nạp tiền', icon: CreditCard },
  { href: '/admin/tools', label: 'Công cụ', icon: Wrench },
  { href: '/admin/templates', label: 'Dữ liệu game', icon: Sprout },
  { href: '/admin/moderation', label: 'Kiểm duyệt', icon: ShieldAlert },
  { href: '/admin/disputes', label: 'Tranh chấp', icon: Gavel },
  { href: '/admin/pages', label: 'Trang & Menu', icon: FileText },
  { href: '/admin/prison', label: 'Nhà tù', icon: Lock },
  { href: '/admin/invites', label: 'Mã mời', icon: Ticket },
  { href: '/admin/imagehost', label: 'Lưu trữ ảnh', icon: ImagePlus },
  { href: '/admin/attachment', label: 'Tệp đính kèm', icon: Paperclip },
  { href: '/admin/profile-fields', label: 'Trường hồ sơ', icon: BadgeInfo },
  { href: '/admin/badges', label: 'Huy hiệu', icon: Award },
  { href: '/admin/verification', label: 'Xác minh', icon: BadgeCheck },
  { href: '/admin/checkin', label: 'Điểm danh', icon: CalendarCheck },
  { href: '/admin/spin', label: 'Vòng quay', icon: Disc3 },
  { href: '/admin/quiz', label: 'Đố vui & Dự đoán', icon: HelpCircle },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  { href: '/admin/groups', label: 'Nhóm & Quyền', icon: KeyRound },
  { href: '/admin/mail', label: 'Email / SMTP', icon: Mail },
  { href: '/admin/push', label: 'Web Push', icon: BellRing },
  { href: '/admin/security', label: 'Chống spam', icon: ShieldCheck },
  { href: '/admin/settings', label: 'Cấu hình', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const path = usePathname();

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user || user.role !== 'ADMIN') {
    return <div className="card m-6 p-10 text-center text-ink-500">Khu vực quản trị — chỉ dành cho Admin.</div>;
  }

  // Shell quản trị độc lập: header + menu + footer riêng (không dùng của forum)
  return (
    <div className="flex min-h-screen flex-col bg-ink-100 dark:bg-ink-950">
      {/* Header admin */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-ink-200/70 bg-ink-900 px-4 text-white dark:border-ink-800">
        <Link href="/admin" className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600">⚙</span>
          <span>Trang quản trị</span>
        </Link>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link href="/" className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-white/85 hover:bg-white/10"><ArrowLeft size={15} /> Về trang chủ</Link>
          <span className="hidden text-white/70 sm:block">{user.displayName || user.username}</span>
          <button onClick={logout} className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-white/85 hover:bg-white/10"><LogOut size={15} /> Đăng xuất</button>
        </div>
      </header>

      {/* Thân: menu trái + nội dung */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-5 px-4 py-5">
        <aside className="card hidden h-fit w-56 shrink-0 p-2 sm:block">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Quản trị</div>
          <nav className="space-y-0.5">
            {NAV.map((n) => {
              const active = path === n.href;
              return (
                <Link key={n.href} href={n.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${active ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'}`}>
                  <n.icon size={16} /> {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>

      {/* Footer admin */}
      <footer className="border-t border-ink-200/70 py-4 text-center text-xs text-ink-500 dark:border-ink-800">
        Trang quản trị · ForumHub
      </footer>
    </div>
  );
}
