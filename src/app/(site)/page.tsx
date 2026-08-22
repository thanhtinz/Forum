import Link from 'next/link';
import type { Metadata } from 'next';
import { PenLine, MessagesSquare, Clock, Newspaper, ChevronRight } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fmtCount, plainText, truncate } from '@/lib/utils';
import { getSiteSettings } from '@/lib/site';
import { BoardList, type BoardSection, type BoardRow } from '@/components/forum/BoardList';
import { TableHead } from '@/components/forum/TableHead';
import { ThreadRow, type ThreadRowData } from '@/components/forum/ThreadRow';
import { ForumSidebar } from '@/components/forum/ForumSidebar';

export const dynamic = 'force-dynamic';

/** Mô tả lấy từ cài đặt trong admin để sửa một chỗ là đổi cả thẻ SEO trang chủ. */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return { title: 'Diễn đàn', description: site.description };
}

const LATEST_TAKE = 12;

export default async function HomePage() {
  const session = await auth();
  const site = await getSiteSettings();

  const [forums, latestThreads, latestPosts] = await Promise.all([
    db.forum.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        threads: {
          orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
          take: 1,
          select: { id: true, title: true, lastReplyAt: true, createdAt: true, author: { select: { username: true } } },
        },
      },
    }),
    db.thread.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
      take: LATEST_TAKE,
      select: {
        id: true, title: true, content: true, createdAt: true, lastReplyAt: true,
        pinned: true, locked: true, solvedReplyId: true, bountyPoints: true,
        viewCount: true, replyCount: true,
        author: { select: { username: true, name: true, image: true } },
        forum: { select: { slug: true, name: true } },
      },
    }),
    db.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: { slug: true, title: true, viewCount: true },
    }),
  ]);

  const toBoard = (f: (typeof forums)[number]): BoardRow => {
    const t = f.threads[0];
    return {
      id: f.id, slug: f.slug, name: f.name, description: f.description, icon: f.icon,
      postAccess: f.postAccess, vipOnly: f.vipOnly,
      threadCount: f.threadCount, replyCount: f.replyCount,
      latest: t ? { id: t.id, title: t.title, at: t.lastReplyAt ?? t.createdAt, author: t.author?.username ?? null } : null,
    };
  };

  // Mục gốc thành "khu vực", mục con thành các hàng bên trong.
  // Mục gốc không có con thì tự nó là một hàng trong khu "Chung".
  const roots = forums.filter((f) => !f.parentId);
  const sections: BoardSection[] = [];
  const loose: BoardRow[] = [];
  for (const root of roots) {
    const children = forums.filter((f) => f.parentId === root.id);
    if (children.length > 0) sections.push({ id: root.id, name: root.name, icon: root.icon, boards: children.map(toBoard) });
    else loose.push(toBoard(root));
  }
  if (loose.length > 0) sections.push({ id: 'loose', name: 'Chuyên mục khác', icon: '💬', boards: loose });

  const threads: ThreadRowData[] = latestThreads.map((t) => ({
    id: t.id, title: t.title, createdAt: t.createdAt, lastReplyAt: t.lastReplyAt,
    pinned: t.pinned, locked: t.locked, solved: !!t.solvedReplyId, bountyPoints: t.bountyPoints,
    viewCount: t.viewCount, replyCount: t.replyCount, author: t.author, forum: t.forum,
    excerpt: truncate(plainText(t.content), 90),
  }));

  const firstForum = forums.find((f) => f.postAccess === 'ALL') ?? forums[0];

  return (
    <div className="space-y-4">
      {/* Thanh tiêu đề: danh tính bên trái, số liệu chia đều, hành động bên phải */}
      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
            <MessagesSquare size={22} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black leading-tight text-ink-900 dark:text-white">Diễn đàn {site.name}</h1>
            <p className="truncate text-xs text-ink-400">Thảo luận, hỏi đáp và giao lưu cùng cộng đồng.</p>
          </div>
        </div>

        {firstForum && (
          <Link href={session?.user ? `/forum/${firstForum.slug}/new` : '/login?callbackUrl=/'}
            className="btn-primary shrink-0 justify-center whitespace-nowrap !px-3.5 !py-2 text-sm">
            <PenLine size={15} /> Đăng chủ đề
          </Link>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <BoardList sections={sections} />

          {/* Bài mới — dòng thời gian toàn diễn đàn */}
          <section className="card overflow-hidden">
            <TableHead title="Bài mới" icon={<Clock size={15} className="text-brand-500" />}
              cols={{ last: 'Hoạt động', a: 'Trả lời', b: 'Lượt xem' }} />
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {threads.length === 0
                ? <p className="px-4 py-8 text-center text-sm text-ink-400">Chưa có chủ đề nào. Hãy mở màn bằng bài đầu tiên.</p>
                : threads.map((t) => <ThreadRow key={t.id} thread={t} showForum />)}
            </div>
          </section>

          {/* Cửa ngõ sang khu bài viết */}
          {latestPosts.length > 0 && (
            <section className="card overflow-hidden">
              <TableHead title="Bài viết mới" icon={<Newspaper size={15} className="text-accent-500" />}
                action={<Link href="/blog" className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-brand-600 hover:underline">Xem tất cả <ChevronRight size={13} /></Link>} />
              <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                {latestPosts.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/posts/${p.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-ink-50 dark:hover:bg-ink-800/50">
                      <span className="line-clamp-1 flex-1 font-medium text-ink-800 dark:text-ink-100">{p.title}</span>
                      <span className="shrink-0 text-xs text-ink-400">{fmtCount(p.viewCount)} xem</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="lg:sticky lg:top-[72px] lg:self-start"><ForumSidebar /></div>
      </div>
    </div>
  );
}

