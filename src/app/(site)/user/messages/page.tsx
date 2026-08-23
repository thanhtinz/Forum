import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { otherId, messagePreview } from '@/lib/messages';
import { fmtAgo, truncate } from '@/lib/utils';
import { LiveRefresh } from '@/components/user/LiveRefresh';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Tin nhắn' };
export const dynamic = 'force-dynamic';

export default async function MessagesPage() {
  const session = await auth();
  const me = session?.user?.id;
  if (!me) redirect('/login');

  const convos = await db.conversation.findMany({
    where: { OR: [{ userAId: me }, { userBId: me }] },
    orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
    take: 50,
    select: {
      id: true, userAId: true, userBId: true, lastMessageAt: true,
      userA: { select: { id: true, name: true, username: true, image: true } },
      userB: { select: { id: true, name: true, username: true, image: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, senderId: true, readAt: true } },
    },
  });

  // Đếm chưa đọc cho từng hội thoại bằng một truy vấn gộp.
  const unreadRows = await db.message.groupBy({
    by: ['conversationId'],
    where: {
      readAt: null,
      senderId: { not: me },
      conversation: { OR: [{ userAId: me }, { userBId: me }] },
    },
    _count: { _all: true },
  });
  const unreadOf = new Map(unreadRows.map((r) => [r.conversationId, r._count._all]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Tin nhắn</h1>
        <p className="text-sm text-ink-500">Trò chuyện riêng với thành viên khác.</p>
      </div>

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {convos.length === 0 && (
          <div className="p-10 text-center">
            <MessageSquare size={28} className="mx-auto mb-2 text-ink-300" />
            <p className="text-sm text-ink-500">Chưa có cuộc trò chuyện nào.</p>
            <p className="mt-1 text-xs text-ink-400">Vào trang cá nhân của một thành viên và bấm “Nhắn tin” để bắt đầu.</p>
          </div>
        )}

        {convos.map((c) => {
          const partner = otherId(c, me) === c.userA.id ? c.userA : c.userB;
          const last = c.messages[0];
          const unread = unreadOf.get(c.id) ?? 0;
          const name = partner.name || partner.username || 'Thành viên';

          return (
            <Link key={c.id} href={`/user/messages/${c.id}`}
              className="flex items-center gap-3 p-3 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/50">
              {partner.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={partner.image} alt="" className="size-11 shrink-0 rounded-full object-cover" />
                : <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {name.charAt(0).toUpperCase()}
                  </span>}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn('truncate text-sm', unread > 0 ? 'font-bold text-ink-900 dark:text-white' : 'font-semibold text-ink-800 dark:text-ink-100')}>
                    {name}
                  </span>
                  {c.lastMessageAt && <span className="ml-auto shrink-0 text-xs text-ink-400">{fmtAgo(c.lastMessageAt)}</span>}
                </div>
                <p className={cn('mt-0.5 truncate text-sm', unread > 0 ? 'text-ink-700 dark:text-ink-200' : 'text-ink-400')}>
                  {last ? `${last.senderId === me ? 'Bạn: ' : ''}${truncate(messagePreview(last.content), 80)}` : 'Chưa có tin nhắn nào'}
                </p>
              </div>

              {unread > 0 && (
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <LiveRefresh seconds={20} />
    </div>
  );
}
