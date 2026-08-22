import Link from 'next/link';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { Search as SearchIcon, MessagesSquare, Newspaper, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { cn, fmtCount, plainText, truncate } from '@/lib/utils';
import { postCardInclude, toCardData } from '@/lib/post-card';
import { PostGrid } from '@/components/PostGrid';
import { Pagination } from '@/components/Pagination';
import { TableHead } from '@/components/forum/TableHead';
import { ThreadRow, type ThreadRowData } from '@/components/forum/ThreadRow';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { getLevelLooks } from '@/lib/level';
import { LevelBadge } from '@/components/LevelBadge';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;

export const metadata: Metadata = { title: 'Tìm kiếm' };

const TABS = [
  { key: 'threads', label: 'Chủ đề', icon: MessagesSquare },
  { key: 'posts', label: 'Bài viết', icon: Newspaper },
  { key: 'users', label: 'Thành viên', icon: Users },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default async function SearchPage({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string; tab?: string }>;
}) {
  const { q: qRaw, page: pageRaw, tab: tabRaw } = await searchParams;
  const q = (qRaw ?? '').trim();
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const tab: TabKey = TABS.some((t) => t.key === tabRaw) ? (tabRaw as TabKey) : 'threads';
  const like = { contains: q, mode: 'insensitive' as const };

  const levelLooks = await getLevelLooks();

  // Đếm cho cả ba tab để hiện số lượng ngay trên nhãn
  const [threadTotal, postTotal, userTotal] = q
    ? await Promise.all([
        db.thread.count({ where: { status: 'PUBLISHED', OR: [{ title: like }, { content: like }] } }),
        db.post.count({ where: { status: 'PUBLISHED', OR: [{ title: like }, { excerpt: like }, { content: like }] } }),
        db.user.count({ where: { status: 'ACTIVE', OR: [{ username: like }, { name: like }] } }),
      ])
    : [0, 0, 0];

  const total = tab === 'threads' ? threadTotal : tab === 'posts' ? postTotal : userTotal;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const skip = (page - 1) * PAGE_SIZE;

  const threads: ThreadRowData[] = q && tab === 'threads'
    ? (await db.thread.findMany({
        where: { status: 'PUBLISHED', OR: [{ title: like }, { content: like }] },
        orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
        skip, take: PAGE_SIZE,
        select: {
          id: true, title: true, content: true, createdAt: true, lastReplyAt: true,
          pinned: true, locked: true, solvedReplyId: true, bountyPoints: true,
          viewCount: true, replyCount: true,
          author: { select: { username: true, name: true, image: true } },
          forum: { select: { slug: true, name: true } },
        },
      })).map((t) => ({
        id: t.id, title: t.title, createdAt: t.createdAt, lastReplyAt: t.lastReplyAt,
        pinned: t.pinned, locked: t.locked, solved: !!t.solvedReplyId, bountyPoints: t.bountyPoints,
        viewCount: t.viewCount, replyCount: t.replyCount, author: t.author, forum: t.forum,
        excerpt: truncate(plainText(t.content), 90),
      }))
    : [];

  const posts = q && tab === 'posts'
    ? await db.post.findMany({
        where: { status: 'PUBLISHED', OR: [{ title: like }, { excerpt: like }, { content: like }] } as Prisma.PostWhereInput,
        orderBy: [{ publishedAt: 'desc' }],
        skip, take: PAGE_SIZE,
        include: postCardInclude,
      })
    : [];

  const users = q && tab === 'users'
    ? await db.user.findMany({
        where: { status: 'ACTIVE', OR: [{ username: like }, { name: like }] },
        orderBy: [{ exp: 'desc' }],
        skip, take: PAGE_SIZE,
        select: { username: true, name: true, image: true, level: true, bio: true, _count: { select: { threads: true, posts: true } } },
      })
    : [];

  const hrefFor = (t: TabKey) => `/search?q=${encodeURIComponent(q)}&tab=${t}`;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <header className="card p-4">
          <form action="/search" className="relative">
            <input type="hidden" name="tab" value={tab} />
            <SearchIcon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="q" defaultValue={q} placeholder="Tìm chủ đề, bài viết, thành viên…" className="input pl-10" autoFocus />
          </form>

          {q && (
            <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto rounded-full bg-ink-100 p-1 dark:bg-ink-800">
              {TABS.map((t) => {
                const count = t.key === 'threads' ? threadTotal : t.key === 'posts' ? postTotal : userTotal;
                return (
                  <Link key={t.key} href={hrefFor(t.key)}
                    className={cn('flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                      tab === t.key ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-700' : 'text-ink-500 hover:text-brand-600')}>
                    <t.icon size={15} /> {t.label}
                    <span className={cn('text-xs', tab === t.key ? 'text-brand-400' : 'text-ink-400')}>{fmtCount(count)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </header>

        {!q ? (
          <div className="card p-12 text-center text-ink-400">Nhập từ khoá để tìm chủ đề, bài viết hoặc thành viên.</div>
        ) : tab === 'threads' ? (
          <section className="card overflow-hidden">
            <TableHead title={`Chủ đề · ${fmtCount(threadTotal)} kết quả`} icon={<MessagesSquare size={15} className="text-brand-500" />}
              cols={{ last: 'Hoạt động', a: 'Trả lời', b: 'Lượt xem' }} />
            {threads.length === 0 ? (
              <p className="p-10 text-center text-sm text-ink-400">Không tìm thấy chủ đề nào cho “{q}”.</p>
            ) : (
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {threads.map((t) => <ThreadRow key={t.id} thread={t} showForum />)}
              </div>
            )}
          </section>
        ) : tab === 'posts' ? (
          <PostGrid posts={posts.map(toCardData)} empty={`Không tìm thấy bài viết nào cho “${q}”.`} />
        ) : (
          <section className="card overflow-hidden">
            <TableHead title={`Thành viên · ${fmtCount(userTotal)} kết quả`} icon={<Users size={15} className="text-emerald-500" />} />
            {users.length === 0 ? (
              <p className="p-10 text-center text-sm text-ink-400">Không tìm thấy thành viên nào cho “{q}”.</p>
            ) : (
              <div className="divide-y divide-ink-100 dark:divide-ink-800">
                {users.map((u) => (
                  <Link key={u.username} href={`/u/${u.username ?? ''}`}
                    className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-ink-50 sm:px-4 dark:hover:bg-ink-800/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {u.image
                      ? <img src={u.image} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                      : <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{(u.name ?? u.username ?? 'U')[0]?.toUpperCase()}</span>}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
                        <span className="truncate">{u.name ?? u.username}</span>
                        <LevelBadge level={u.level} icon={levelLooks.get(u.level)?.icon}
                          color={levelLooks.get(u.level)?.color} name={levelLooks.get(u.level)?.name} />
                      </p>
                      <p className="truncate text-xs text-ink-400">{u.bio || `@${u.username}`}</p>
                    </div>
                    <span className="hidden shrink-0 text-xs text-ink-400 sm:block">
                      {fmtCount(u._count.threads)} chủ đề · {fmtCount(u._count.posts)} bài viết
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {q && totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={hrefFor(tab)} />}
      </div>

      <div className="hidden lg:block lg:sticky lg:top-[72px] lg:self-start"><ForumSidebar /></div>
    </div>
  );
}
