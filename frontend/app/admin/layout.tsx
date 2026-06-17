'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Sparkles, ShieldAlert, Users, Lock, Wrench, Sprout, Store, CreditCard, Settings, FileText, Ticket, BadgeInfo, Award, BadgeCheck, CalendarCheck, Disc3, Gift, HelpCircle, ImagePlus, Paperclip, Mail, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const NAV = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard },
  { href: '/admin/fortune', label: 'Bói toán & AI', icon: Sparkles },
  { href: '/admin/marketplace', label: 'Quản lý Chợ', icon: Store },
  { href: '/admin/payments', label: 'Nạp tiền', icon: CreditCard },
  { href: '/admin/tools', label: 'Công cụ', icon: Wrench },
  { href: '/admin/templates', label: 'Dữ liệu game', icon: Sprout },
  { href: '/admin/moderation', label: 'Kiểm duyệt', icon: ShieldAlert },
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
  { href: '/admin/mail', label: 'Email / SMTP', icon: Mail },
  { href: '/admin/security', label: 'Chống spam', icon: ShieldCheck },
  { href: '/admin/settings', label: 'Cấu hình', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (!user || user.role !== 'ADMIN') {
    return <div className="card p-10 text-center text-ink-500">Khu vực quản trị — chỉ dành cho Admin.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[220px_1fr]">
      <aside className="card h-fit p-2">
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
      <div>{children}</div>
    </div>
  );
}
