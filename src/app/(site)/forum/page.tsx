import Link from 'next/link';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { Prisma } from '@prisma/client';
import { MessagesSquare, MessageSquare, ChevronRight, Flame } from 'lucide-react';
import { db } from '@/lib/db';
import { fmtCount } from '@/lib/utils';
import { FORUM_ACCESS_BADGE, forumTint } from '@/lib/forum';
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
  const totalThreads = forums.reduce((s, f) => s + f.threadCount, 0);
  const totalReplies = forums.reduce((s, f) => s + f.replyCount, 0);

  return (
    <div className="space-y-6">
      {/* Hero kiểu zibll */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-400 p-6 text-white shadow-card sm:p-8">
        <div className="relative">
          <h1 className="flex items-center gap-2 text-2xl font-black drop-shadow sm:text-3xl">
            <MessagesSquare size={28} /> Diễn đàn
          </h1>
          <p className="mt-1 max-w-lg text-white/90 drop-shadow">Thảo luận, hỏi đáp và giao lưu cùng cộng đồng Nova.</p>
          <div className="mt-4 flex gap-6 text-sm">
            <span className="flex flex-col"><b className="text-xl font-black">{fmtCount(totalThreads)}</b>chủ đề</span>
            <span className="flex flex-col"><b className="text-xl font-black">{fmtCount(totalReplies)}</b>trả lời</span>
            <span className="flex flex-col"><b className="text-xl font-black">{fmtCount(forums.length)}</b>diễn đàn</span>
          </div>
        </div>
        <MessagesSquare className="pointer-events-none absolute -bottom-6 -right-4 opacity-10" size={160} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          {roots.length === 0 ? (
            <div className="card p-10 text-center text-ink-400">Chưa có diễn đàn nào.</div>
          ) : (
            roots.map((root) => {
              const kids = childrenOf(root.id);
              const cards = kids.length > 0 ? kids : [root];
              return (
                <section key={root.id}>
                  <h2 className="zib-title mb-4 flex items-center gap-2">
                    {root.icon && <span aria-hidden>{root.icon}</span>}
                    {root.name}
                  </h2>
                  <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                    {cards.map((f) => <ForumCard key={f.id} forum={f} />)}
                  </div>
                </section>
              );
            })
          )}
        </div>

        <div className="hidden lg:block"><HomeSidebar /></div>
      </div>
    </div>
  );
}

function ForumCard({ forum }: { forum: ForumWithLatest }) {
  const badge = FORUM_ACCESS_BADGE[forum.postAccess];
  const latest = forum.threads[0];
  const tint = forumTint(forum.slug);
  return (
    <article className="post-card group p-4">
      <div className="flex items-start gap-3">
        <Link
          href={`/forum/${forum.slug}`}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
          style={{ background: `${tint}1f`, color: tint }}
        >
          {forum.icon ?? <MessagesSquare size={22} />}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/forum/${forum.slug}`} className="font-bold hover:text-brand-600">{forum.name}</Link>
            {badge && <span className={`chip ${badge.className}`}>{badge.label}</span>}
          </div>
          {forum.description && <p className="mt-0.5 line-clamp-1 text-sm text-ink-500">{forum.description}</p>}
        </div>
        <ChevronRight size={18} className="mt-1 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-ink-100 pt-2.5 text-[12px] text-ink-400 dark:border-ink-800">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1"><MessageSquare size={13} />{fmtCount(forum.threadCount)} chủ đề</span>
          <span className="flex items-center gap-1"><Flame size={13} />{fmtCount(forum.replyCount)} trả lời</span>
        </span>
        {latest && (
          <Link href={`/forum/${forum.slug}/${latest.id}`} className="hidden max-w-[45%] items-center gap-1 truncate hover:text-brand-600 sm:flex">
            <span className="truncate">{latest.title}</span>
            <span className="shrink-0">· {format(latest.lastReplyAt ?? latest.createdAt, 'dd/MM')}</span>
          </Link>
        )}
      </div>
    </article>
  );
}
