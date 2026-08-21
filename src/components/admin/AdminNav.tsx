'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, FileText, FolderTree, Users, Banknote, Flag, Crown, ShieldAlert, Gamepad2, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sub { label: string; status: string }
interface Item { href: string; label: string; icon: typeof FileText; exact?: boolean; defaultStatus?: string; subs?: Sub[] }

const ITEMS: Item[] = [
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

export function AdminNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <nav className="card flex gap-1 overflow-x-auto p-1.5 lg:sticky lg:top-[4.5rem] lg:flex-col">
      <div className="mb-1 hidden items-center gap-1.5 px-3 py-2 text-sm font-bold text-brand-600 lg:flex"><ShieldAlert size={16} /> Quản trị</div>
      {ITEMS.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        const Icon = it.icon;
        const currentStatus = searchParams.get('status') ?? it.defaultStatus;
        return (
          <div key={it.href} className="contents lg:block">
            <Link href={it.href}
              className={cn('flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-brand-500 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800')}>
              <Icon size={16} /> {it.label}
            </Link>

            {/* Trang con theo trạng thái — hiện khi mục đang được chọn */}
            {active && it.subs && (
              <div className="flex shrink-0 gap-1 lg:mb-1 lg:mt-0.5 lg:flex-col lg:border-l lg:border-ink-100 lg:pl-2.5 dark:lg:border-ink-800">
                {it.subs.map((s) => {
                  const subActive = currentStatus === s.status;
                  const href = s.status === (it.defaultStatus ?? 'ALL') ? it.href : `${it.href}?status=${s.status}`;
                  return (
                    <Link key={s.status} href={href}
                      className={cn('shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors lg:py-1.5',
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
    </nav>
  );
}
