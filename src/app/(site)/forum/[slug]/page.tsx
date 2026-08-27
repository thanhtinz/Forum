import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { MessagesSquare, MessageSquare, PenLine } from 'lucide-react';
import { db } from '@/lib/db';
import { truncate, plainText, cn } from '@/lib/utils';
import { FORUM_ACCESS_BADGE, forumTint } from '@/lib/forum';
import { Pagination } from '@/components/Pagination';
import { ThreadRow, type ThreadRowData } from '@/components/forum/ThreadRow';
import { TableHead } from '@/components/forum/TableHead';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { IconGlyph } from '@/components/IconGlyph';
import { authorChipSelect, toAuthorChip } from '@/lib/shop';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 15;

const TABS = [
  { key: 'new', label: 'Mới nhất' },
  { key: 'hot', label: 'Nhiều trả lời' },
  { key: 'featured', label: 'Tinh hoa' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const ORDER_BY: Record<TabKey, Prisma.ThreadOrderByWithRelationInput[]> = {
  new: [{ pinned: 'desc' }, { lastReplyAt: 'desc' }, { createdAt: 'desc' }],
  hot: [{ pinned: 'desc' }, { replyCount: 'desc' }, { viewCount: 'desc' }],
  featured: [{ pinned: 'desc' }, { createdAt: 'desc' }],
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const forum = await db.forum.findUnique({ where: { slug }, select: { name: true, description: true } });
  return forum ? { title: `Diễn đàn: ${forum.name}`, description: forum.description ?? undefined } : { title: 'Không tìm thấy diễn đàn' };
}

export default async function ForumPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const { page: pageRaw, sort: sortRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const tab: TabKey = TABS.some((t) => t.key === sortRaw) ? (sortRaw as TabKey) : 'new';

  const forum = await db.forum.findUnique({
    where: { slug },
    include: {
      parent: { select: { name: true, slug: true } },
      children: { orderBy: { order: 'asc' }, select: { slug: true, name: true, icon: true } },
    },
  });
  if (!forum) notFound();

  const where: Prisma.ThreadWhereInput = { forumId: forum.id, status: 'PUBLISHED', ...(tab === 'featured' ? { featured: true } : {}) };
  const [total, threads] = await Promise.all([
    db.thread.count({ where }),
    db.thread.findMany({
      where,
      orderBy: ORDER_BY[tab],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: authorChipSelect } },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const badge = FORUM_ACCESS_BADGE[forum.postAccess];
  const tint = forumTint(forum.slug);
  const qs = (t: TabKey) => (t === 'new' ? `/forum/${slug}` : `/forum/${slug}?sort=${t}`);

  const rows: ThreadRowData[] = threads.map((t) => ({
    id: t.id, title: t.title, createdAt: t.createdAt, lastReplyAt: t.lastReplyAt,
    pinned: t.pinned, locked: t.locked, solved: !!t.solvedReplyId, bountyPoints: t.bountyPoints,
    viewCount: t.viewCount, replyCount: t.replyCount, author: toAuthorChip(t.author),
    excerpt: truncate(plainText(t.content), 90),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {/* Header diễn đàn */}
        <header className="card mb-4 p-5">
          <nav className="mb-2 flex items-center gap-1.5 text-sm text-ink-400">
            <Link href="/" className="hover:text-brand-600">Diễn đàn</Link>
            {forum.parent && <><span>/</span><Link href={`/forum/${forum.parent.slug}`} className="hover:text-brand-600">{forum.parent.name}</Link></>}
          </nav>
          <div className="flex items-start gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: `${tint}1f`, color: tint }}>
              <IconGlyph icon={forum.icon} fallback={<MessagesSquare size={26} />} className="size-11" />
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
                {forum.name}
                {badge && <span className={`chip ${badge.className}`}>{badge.label}</span>}
              </h1>
              {forum.description && <p className="mt-1 text-sm text-ink-500">{forum.description}</p>}
            </div>
          </div>

          {forum.children.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
              {forum.children.map((c) => (
                <Link key={c.slug} href={`/forum/${c.slug}`} className="chip gap-1 bg-ink-100 font-medium text-ink-600 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-200">
                  {c.icon ?? <MessagesSquare size={11} />} {c.name}
                </Link>
              ))}
            </div>
          )}
        </header>

        {/* Thanh tab lọc kiểu zibll + nút đăng */}
        <div className="mb-4 flex items-center gap-2">
          <div className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-full bg-ink-100 p-1 sm:flex-none dark:bg-ink-800">
            {TABS.map((t) => (
              <Link key={t.key} href={qs(t.key)}
                className={cn('shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  tab === t.key ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-700' : 'text-ink-500 hover:text-brand-600')}>
                {t.label}
              </Link>
            ))}
          </div>
          <Link href={`/forum/${slug}/new`} className="btn-primary shrink-0 whitespace-nowrap !px-3 !py-1.5 text-sm sm:ml-auto">
            <PenLine size={15} /> Đăng chủ đề
          </Link>
        </div>

        {/* Danh sách chủ đề kiểu bảng diễn đàn */}
        <section className="card overflow-hidden">
          <TableHead title="Chủ đề" icon={<MessageSquare size={15} className="text-brand-500" />}
            cols={{ last: 'Hoạt động', a: 'Trả lời', b: 'Lượt xem' }} />

          {threads.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-ink-400">
              <MessageSquare size={28} />
              <p>Chưa có chủ đề nào ở mục này.</p>
            </div>
          ) : (
            <div className="retro-stripe divide-y divide-ink-100 dark:divide-ink-800">
              {rows.map((t) => <ThreadRow key={t.id} thread={t} forumSlug={forum.slug} />)}
            </div>
          )}
        </section>

        <div className="mt-4"><Pagination page={page} totalPages={totalPages} basePath={tab === 'new' ? `/forum/${slug}` : `/forum/${slug}?sort=${tab}`} /></div>
      </div>

      <div className="hidden lg:block lg:sticky lg:top-[72px] lg:self-start"><ForumSidebar /></div>
    </div>
  );
}
