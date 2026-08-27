'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, FileText, FolderTree, MessagesSquare, MessageSquareText, Users, Flag, TrendingUp, Award, ShieldCheck,
  Crown, TicketPercent, Banknote, Receipt, Images, Link2, Cloud, Sticker, Wand2, Wallpaper, MessageCircle, Menu, Settings, ScrollText, DatabaseBackup,
  Gamepad2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sub { label: string; status: string }
interface Item {
  href: string; label: string; icon: typeof FileText; exact?: boolean;
  defaultStatus?: string; subs?: Sub[];
  /** Tên tham số cho mục con — mặc định là `status`. */
  param?: string;
}
interface Group {
  title?: string;
  items: Item[];
  /** Nhóm chỉ quản trị viên thấy; điều hành viên không hiện. */
  superAdminOnly?: boolean;
}

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
      { href: '/admin/moderators', label: 'Điều hành viên', icon: ShieldCheck },
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
      { href: '/admin/levels', label: 'Cấp độ', icon: TrendingUp },
      { href: '/admin/medals', label: 'Huy chương', icon: Award },
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
      { href: '/admin/coupons', label: 'Mã giảm giá', icon: TicketPercent },
    ],
  },
  {
    title: 'Giao diện',
    items: [
      {
        href: '/admin/nav', label: 'Menu điều hướng', icon: Menu, param: 'group', defaultStatus: 'header',
        subs: [
          { label: 'Trên đầu trang', status: 'header' },
          { label: 'Chân trang', status: 'footer' },
        ],
      },
      { href: '/admin/slides', label: 'Slide trang chủ', icon: Images },
      { href: '/admin/chat-backgrounds', label: 'Ảnh nền chat', icon: Wallpaper },
      { href: '/admin/chat-bubbles', label: 'Bong bóng chat', icon: MessageCircle },
      { href: '/admin/links', label: 'Liên kết bạn bè', icon: Link2 },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { href: '/admin/settings', label: 'Cài đặt chung', icon: Settings },
      { href: '/admin/storage', label: 'Lưu trữ ảnh', icon: Cloud },
      { href: '/admin/stickers', label: 'Bộ sticker', icon: Sticker },
      { href: '/admin/gif', label: 'GIF', icon: Wand2 },
      { href: '/admin/logs', label: 'Nhật ký quản trị', icon: ScrollText },
      { href: '/admin/backup', label: 'Sao lưu dữ liệu', icon: DatabaseBackup },
    ],
  },
  {
    title: 'Game Hub',
    // Kho game là hàng của nền tảng — điều hành viên không nhập hàng.
    superAdminOnly: true,
    items: [
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
    ],
  },
];

/** Danh sách liên kết điều hướng (dùng cho cả sidebar PC và drawer mobile). */
export function AdminNavItems({ onNavigate, isSuperAdmin = true }: {
  onNavigate?: () => void;
  /** Điều hành viên không thấy các nhóm chỉ dành cho quản trị viên. */
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const groups = ADMIN_GROUPS.filter((g) => isSuperAdmin || !g.superAdminOnly);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, gi) => (
        <div key={group.title ?? `g${gi}`} className="flex flex-col gap-0.5">
          {group.title && (
            <div className="px-3 pb-0.5 pt-1 text-[11px] font-bold uppercase tracking-wide text-ink-400">
              {group.title}
            </div>
          )}

          {group.items.map((it) => {
            const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
            const Icon = it.icon;
            const param = it.param ?? 'status';
                const currentStatus = searchParams.get(param) ?? it.defaultStatus;
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
                      const href = s.status === (it.defaultStatus ?? 'ALL') ? it.href : `${it.href}?${param}=${s.status}`;
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
