import Link from 'next/link';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { MessagesSquare, MessageSquare, Users } from 'lucide-react';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { fmtCount } from '@/lib/utils';
import { FORUM_ACCESS_BADGE } from '@/lib/forum';
import { HomeSidebar } from '@/components/HomeSidebar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Diễn đàn',
  description: 'Khu vực thảo luận, hỏi đáp và giao lưu của cộng đồng Nova.',
};

const latestThread = {
  orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
  take: 1,
  select: {
    id: true,
    title: true,
    lastReplyAt: true,
    createdAt: true,
    author: { select: { username: true, name: true } },
  },
} satisfies Prisma.Forum$threadsArgs;

type ForumWithLatest = Prisma.ForumGetPayload<{ include: { threads: typeof latestThread } }>;

export default async function ForumIndexPage() {
  const forums = await db.forum.findMany({
    orderBy: { order: 'asc' },
    include: { threads: latestThread },
  });

  const roots = forums.filter((f) => !f.parentId);
  const childrenOf = (id: string) => forums.filter((f) => f.parentId === id).sort((a, b) => a.order - b.order);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <header className="card mb-5 flex items-center gap-3 p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white"><MessagesSquare size={20} /></span>
          <div>
            <h1 className="text-xl font-bold">Diễn đàn</h1>
            <p className="text-sm text-ink-500">Thảo luận, hỏi đáp và giao lưu cùng cộng đồng.</p>
          </div>
        </header>

        {roots.length === 0 ? (
          <div className="card p-10 text-center text-ink-400">Chưa có diễn đàn nào.</div>
        ) : (
          <div className="space-y-6">
            {roots.map((root) => {
              const kids = childrenOf(root.id);
              const rows = kids.length > 0 ? kids : [root];
              return (
                <section key={root.id} className="card overflow-hidden">
                  <div className="border-b border-ink-100 bg-ink-50/60 px-5 py-3 dark:border-ink-800 dark:bg-ink-900/40">
                    <h2 className="flex items-center gap-2 font-bold">
                      {root.icon && <span aria-hidden>{root.icon}</span>}
                      {root.name}
                    </h2>
                    {root.description && <p className="mt-0.5 text-xs text-ink-500">{root.description}</p>}
                  </div>
                  <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                    {rows.map((f) => (
                      <li key={f.id}><ForumRow forum={f} /></li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden lg:block"><HomeSidebar /></div>
    </div>
  );
}

function ForumRow({ forum }: { forum: ForumWithLatest }) {
  const badge = FORUM_ACCESS_BADGE[forum.postAccess];
  const latest = forum.threads[0];
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <Link href={`/forum/${forum.slug}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-lg dark:bg-brand-950/50">
        {forum.icon ?? <MessagesSquare size={20} className="text-brand-600" />}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/forum/${forum.slug}`} className="font-semibold hover:text-brand-600">{forum.name}</Link>
          {badge && <span className={`chip ${badge.className}`}>{badge.label}</span>}
        </div>
        {forum.description && <p className="mt-0.5 line-clamp-1 text-sm text-ink-500">{forum.description}</p>}
      </div>

      <div className="hidden shrink-0 gap-5 text-center text-xs text-ink-500 sm:flex">
        <span className="flex flex-col"><span className="text-base font-bold text-ink-700 dark:text-ink-200">{fmtCount(forum.threadCount)}</span>chủ đề</span>
        <span className="flex flex-col"><span className="text-base font-bold text-ink-700 dark:text-ink-200">{fmtCount(forum.replyCount)}</span>trả lời</span>
      </div>

      <div className="hidden w-48 shrink-0 md:block">
        {latest ? (
          <Link href={`/forum/${forum.slug}/${latest.id}`} className="group block">
            <p className="line-clamp-1 text-sm font-medium group-hover:text-brand-600">{latest.title}</p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-400">
              <Users size={11} /> {latest.author?.name ?? latest.author?.username ?? 'Ẩn danh'}
              <span>·</span>
              {format(latest.lastReplyAt ?? latest.createdAt, 'dd/MM HH:mm')}
            </p>
          </Link>
        ) : (
          <p className="flex items-center gap-1 text-xs text-ink-400"><MessageSquare size={12} /> Chưa có bài</p>
        )}
      </div>
    </div>
  );
}
