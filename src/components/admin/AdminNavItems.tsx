'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, FileText, FolderTree, MessagesSquare, MessageSquareText, Users, Flag,
  Crown, TicketPercent, Banknote, Receipt, Images, Link2, Cloud, Sticker, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sub { label: string; status: string }
interface Item { href: string; label: string; icon: typeof FileText; exact?: boolean; defaultStatus?: string; subs?: Sub[] }
interface Group { title?: string; items: Item[] }

/** Điều hướng quản trị, chia nhóm theo công việc. */
export const ADMIN_GROUPS: Group[] = [
  {
    items: [{ href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, exact: true }],
  },
  {
    title: 'Cửa hàng',
    items: [
      {
        href: '/admin/posts', label: 'Bài bán hàng', icon: FileText, defaultStatus: 'ALL',
        subs: [
          { label: 'Tất cả', status: 'ALL' },
          { label: 'Chờ duyệt', status: 'PENDING' },
          { label: 'Đã đăng', status: 'PUBLISHED' },
          { label: 'Đã ẩn', status: 'ARCHIVED' },
        ],
      },
      { href: '/admin/categories', label: 'Chuyên mục', icon: FolderTree },
    ],
  },
  {
    title: 'Diễn đàn',
    items: [
      { href: '/admin/forums', label: 'Khu vực', icon: MessagesSquare },
      {
        href: '/admin/threads', label: 'Chủ đề', icon: MessageSquareText, defaultStatus: 'ALL',
        subs: [
          { label: 'Tất cả', status: 'ALL' },
          { label: 'Chờ duyệt', status: 'PENDING' },
          { label: 'Đang hiện', status: 'PUBLISHED' },
          { label: 'Đã ẩn', status: 'HIDDEN' },
        ],
      },
    ],
  },
  {
    title: 'Thành viên',
    items: [
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
    ],
  },
  {
    title: 'Kinh doanh',
    items: [
      {
        href: '/admin/orders', label: 'Đơn hàng', icon: Receipt, defaultStatus: 'ALL',
        subs: [
          { label: 'Tất cả', status: 'ALL' },
          { label: 'Chờ thanh toán', status: 'PENDING' },
          { label: 'Đã thanh toán', status: 'PAID' },
          { label: 'Đã huỷ', status: 'CANCELLED' },
        ],
      },
      { href: '/admin/vip-plans', label: 'Gói VIP', icon: Crown },
      { href: '/admin/coupons', label: 'Mã giảm giá', icon: TicketPercent },
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
    ],
  },
  {
    title: 'Giao diện',
    items: [
      { href: '/admin/slides', label: 'Slide trang chủ', icon: Images },
      { href: '/admin/links', label: 'Liên kết bạn bè', icon: Link2 },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/admin/storage', label: 'Lưu trữ ảnh', icon: Cloud },
      { href: '/admin/stickers', label: 'Bộ sticker', icon: Sticker },
      { href: '/admin/gif', label: 'GIF', icon: Wand2 },
    ],
  },
];

/** Danh sách liên kết điều hướng (dùng cho cả sidebar PC và drawer mobile). */
export function AdminNavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-col gap-3">
      {ADMIN_GROUPS.map((group, gi) => (
        <div key={group.title ?? `g${gi}`} className="flex flex-col gap-0.5">
          {group.title && (
            <div className="px-3 pb-0.5 pt-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">
              {group.title}
            </div>
          )}

          {group.items.map((it) => {
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
      ))}
    </div>
  );
}
