import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { Pagination } from '@/components/Pagination';
import { NotificationItem } from '@/components/user/NotificationItem';
import { markAllRead } from './actions';

export const metadata: Metadata = { title: 'Thông báo' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/notifications');
  const userId = session.user.id;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [total, unread, items] = await Promise.all([
    db.notification.count({ where: { userId } }),
    db.notification.count({ where: { userId, read: false } }),
    db.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Bell size={20} /> Thông báo {unread > 0 && <span className="chip bg-brand-500 text-white">{unread} mới</span>}</h1>
        {unread > 0 && (
          <form action={markAllRead}>
            <button type="submit" className="btn-outline !py-1.5 text-sm"><CheckCheck size={15} /> Đánh dấu đã đọc</button>
          </form>
        )}
      </div>

      <div className="card divide-y divide-ink-100 overflow-hidden dark:divide-ink-800">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-ink-400"><Bell size={30} /><p>Chưa có thông báo nào.</p></div>
        ) : (
          items.map((n) => (
            <NotificationItem key={n.id} n={{ id: n.id, type: n.type, title: n.title, content: n.content, link: n.link, read: n.read, createdAt: format(n.createdAt, 'dd/MM/yyyy HH:mm') }} />
          ))
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} basePath="/user/notifications" />
    </div>
  );
}
