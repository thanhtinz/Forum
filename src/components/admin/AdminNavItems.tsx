'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, FileText, FolderTree, Users, Banknote, Flag, Crown, Gamepad2, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sub { label: string; status: string }
interface Item { href: string; label: string; icon: typeof FileText; exact?: boolean; defaultStatus?: string; subs?: Sub[] }

export const ADMIN_ITEMS: Item[] = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, exact: true },
  {
    href: '/admin/posts', label: 'Bài viết', icon: FileText, defaultStatus: 'ALL',
    subs: [
      { label: 'Tất cả', status: 'ALL' },
      { label: 'Chờ duyệt', status: 'PENDING' },
      { label: 'Đã đăng', status: 'PUBLISHED' },
      { label: 'Đã ẩn', status: 'ARCHIVED' },
    ],
  },
  { href: '/admin/categories', label: 'Chuyên mục', icon: FolderTree },
  { href: '/admin/users', label: 'Người dùng', icon: Users },
  {
    href: '/admin/reports', label: 'Báo cáo', icon: Flag, defaultStatus: 'OPEN',
    subs: [
      { label: 'Chờ xử lý', status: 'OPEN' },
      { label: 'Đã xử lý', status: 'RESOLVED' },
      { label: 'Đã bỏ qua', status: 'DISMISSED' },
      { label: 'Tất cả', status: 'ALL' },
    ],
  },
  { href: '/admin/vip-plans', label: 'Gói VIP', icon: Crown },
  {
    href: '/admin/withdrawals', label: 'Rút tiền', icon: Banknote, defaultStatus: 'ALL',
    subs: [
      { label: 'Tất cả', status: 'ALL' },
      { label: 'Chờ xử lý', status: 'PENDING' },
      { label: 'Đã duyệt', status: 'APPROVED' },
      { label: 'Đã trả', status: 'PAID' },
      { label: 'Từ chối', status: 'REJECTED' },
    ],
  },
  {
    href: '/admin/games', label: 'Game', icon: Gamepad2, defaultStatus: 'ALL',
    subs: [
      { label: 'Tất cả', status: 'ALL' },
      { label: 'Nháp', status: 'DRAFT' },
      { label: 'Chờ duyệt', status: 'PENDING' },
      { label: 'Đã đăng', status: 'PUBLISHED' },
      { label: 'Lưu trữ', status: 'ARCHIVED' },
    ],
  },
  { href: '/admin/emulator', label: 'Emulator', icon: Cpu },
];

/** Danh sách liên kết điều hướng quản trị (dùng cho cả sidebar PC và drawer mobile). */
export function AdminNavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-col gap-1">
      {ADMIN_ITEMS.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        const Icon = it.icon;
        const currentStatus = searchParams.get('status') ?? it.defaultStatus;
        return (
          <div key={it.href}>
            <Link href={it.href} onClick={onNavigate}
              className={cn('flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-brand-500 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800')}>
              <Icon size={16} /> {it.label}
            </Link>

            {active && it.subs && (
              <div className="mt-0.5 flex flex-col gap-0.5 border-l border-ink-100 pl-2.5 dark:border-ink-800">
                {it.subs.map((s) => {
                  const subActive = currentStatus === s.status;
                  const href = s.status === (it.defaultStatus ?? 'ALL') ? it.href : `${it.href}?status=${s.status}`;
                  return (
                    <Link key={s.status} href={href} onClick={onNavigate}
                      className={cn('rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                        subActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800')}>
                      {s.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
