import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import type { NotificationType, Prisma } from '@prisma/client';
import { Bell, CheckCheck, Trash2, Settings } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { cn, tinhSoTrang } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { NotificationItem } from '@/components/user/NotificationItem';
import { markAllRead, clearRead } from './actions';

export const metadata: Metadata = { title: 'Thông báo' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

/** Các bộ lọc trên đầu trang; mỗi mục gộp vài loại cho gọn. */
const TABS: { key: string; label: string; types?: NotificationType[] }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unread', label: 'Chưa đọc' },
  { key: 'reply', label: 'Trả lời & bình luận', types: ['REPLY', 'COMMENT'] },
  { key: 'mention', label: 'Nhắc tên', types: ['MENTION'] },
  { key: 'social', label: 'Thích & theo dõi', types: ['LIKE', 'FOLLOW'] },
  { key: 'donate', label: 'Được tặng điểm', types: ['DONATE'] },
  { key: 'system', label: 'Hệ thống', types: ['MEDAL', 'SYSTEM'] },
];

export default async function NotificationsPage({ searchParams }: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/notifications');
  const userId = session.user.id;
  const { page: pageRaw, tab: tabRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const tab = TABS.find((t) => t.key === tabRaw) ?? TABS[0];

  const where: Prisma.NotificationWhereInput = { userId };
  if (tab.key === 'unread') where.read = false;
  else if (tab.types) where.type = { in: tab.types };

  const [total, unread, readCount, items] = await Promise.all([
    db.notification.count({ where }),
    db.notification.count({ where: { userId, read: false } }),
    db.notification.count({ where: { userId, read: true } }),
    db.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const totalPages = tinhSoTrang(total, PAGE_SIZE);
  const tabHref = (key: string) => (key === 'all' ? '/user/notifications' : `/user/notifications?tab=${key}`);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Bell size={20} /> Thông báo
          {unread > 0 && <span className="chip bg-brand-500 text-white">{unread} mới</span>}
        </h1>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <form action={markAllRead}>
              <button type="submit" className="btn-outline !py-1.5 text-sm"><CheckCheck size={15} /> Đánh dấu đã đọc</button>
            </form>
          )}
          {readCount > 0 && (
            <form action={clearRead}>
              <button type="submit" title="Xoá các thông báo đã đọc"
                className="btn-outline !py-1.5 text-sm"><Trash2 size={15} /> Dọn đã đọc</button>
            </form>
          )}
          <Link href="/user/settings" title="Cài đặt thông báo"
            className="grid size-9 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800">
            <Settings size={16} />
          </Link>
        </div>
      </div>

      {/* Bộ lọc — cuộn ngang trên máy hẹp thay vì xuống dòng lộn xộn */}
      <div className="no-scrollbar mb-3 flex gap-1.5 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t.key} href={tabHref(t.key)}
            className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
              t.key === tab.key
                ? 'border-brand-500 bg-brand-500 font-medium text-white'
                : 'border-ink-200 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800')}>
            {t.label}
            {t.key === 'unread' && unread > 0 && <span className="ml-1 opacity-80">{unread}</span>}
          </Link>
        ))}
      </div>

      <div className="card divide-y divide-ink-100 overflow-hidden dark:divide-ink-800">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-ink-400">
            <Bell size={30} />
            <p>{tab.key === 'all' ? 'Chưa có thông báo nào.' : 'Không có thông báo nào ở mục này.'}</p>
          </div>
        ) : (
          items.map((n) => (
            <NotificationItem key={n.id} n={{ id: n.id, type: n.type, title: n.title, content: n.content, link: n.link, read: n.read, createdAt: format(n.createdAt, 'dd/MM/yyyy HH:mm') }} />
          ))
        )}
      </div>
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={tabHref(tab.key)} />}
    </div>
  );
}
