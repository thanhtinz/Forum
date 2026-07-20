import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { MessagesSquare, Pin, Lock, MessageSquare, Eye, Heart, Award, CheckCircle2, PenLine } from 'lucide-react';
import { db } from '@/lib/db';
import { fmtCount, truncate, cn } from '@/lib/utils';
import { FORUM_ACCESS_BADGE, forumTint } from '@/lib/forum';
import { Pagination } from '@/components/Pagination';
import { HomeSidebar } from '@/components/HomeSidebar';

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
      include: {
        author: { select: { username: true, name: true, image: true } },
        tags: { include: { tag: { select: { slug: true, name: true } } } },
      },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const badge = FORUM_ACCESS_BADGE[forum.postAccess];
  const tint = forumTint(forum.slug);
  const qs = (t: TabKey) => (t === 'new' ? `/forum/${slug}` : `/forum/${slug}?sort=${t}`);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {/* Header diễn đàn */}
        <header className="card mb-4 p-5">
          <nav className="mb-2 flex items-center gap-1.5 text-sm text-ink-400">
            <Link href="/forum" className="hover:text-brand-600">Diễn đàn</Link>
            {forum.parent && <><span>/</span><Link href={`/forum/${forum.parent.slug}`} className="hover:text-brand-600">{forum.parent.name}</Link></>}
          </nav>
          <div className="flex items-start gap-3">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl" style={{ background: `${tint}1f`, color: tint }}>
              {forum.icon ?? <MessagesSquare size={26} />}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
                {forum.name}
                {badge && <span className={`chip ${badge.className}`}>{badge.label}</span>}
              </h1>
              {forum.description && <p className="mt-1 text-sm text-ink-500">{forum.description}</p>}
              <p className="mt-1 text-xs text-ink-400">{fmtCount(forum.threadCount)} chủ đề · {fmtCount(forum.replyCount)} trả lời</p>
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
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex gap-1 rounded-full bg-ink-100 p-1 dark:bg-ink-800">
            {TABS.map((t) => (
              <Link key={t.key} href={qs(t.key)}
                className={cn('rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  tab === t.key ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-700' : 'text-ink-500 hover:text-brand-600')}>
                {t.label}
              </Link>
            ))}
          </div>
          <Link href="/user/write" className="btn-primary !px-3.5 !py-1.5 text-sm"><PenLine size={15} /> Đăng chủ đề</Link>
        </div>

        {/* Feed chủ đề */}
        {threads.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center text-ink-400">
            <MessageSquare size={28} />
            <p>Chưa có chủ đề nào ở mục này.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => {
              const name = t.author?.name ?? t.author?.username ?? 'Ẩn danh';
              const excerpt = truncate(t.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(), 140);
              return (
                <article key={t.id} className="post-card group p-4">
                  {/* Tác giả + thời gian */}
                  <div className="mb-2 flex items-center gap-2.5">
                    <Link href={`/u/${t.author?.username ?? ''}`} className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {t.author?.image
                        ? <img src={t.author.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                        : <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-200 text-sm font-bold text-ink-600 dark:bg-ink-700 dark:text-ink-200">{name[0]?.toUpperCase()}</span>}
                    </Link>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-semibold">{name}</p>
                      <p className="text-xs text-ink-400">{format(t.lastReplyAt ?? t.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1.5">
                      {t.pinned && <span className="chip gap-1 bg-brand-100 text-brand-600 dark:bg-brand-950/50"><Pin size={11} />Ghim</span>}
                      {t.locked && <Lock size={13} className="text-ink-400" aria-label="Đã khoá" />}
                      {t.solvedReplyId && <span className="chip gap-1 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50"><CheckCircle2 size={11} />Đã giải quyết</span>}
                      {t.bountyPoints ? <span className="chip gap-1 bg-amber-100 text-amber-600 dark:bg-amber-950/50"><Award size={11} />{fmtCount(t.bountyPoints)}đ</span> : null}
                    </div>
                  </div>

                  {/* Tiêu đề + trích đoạn */}
                  <Link href={`/forum/${forum.slug}/${t.id}`} className="block">
                    <h3 className="font-bold leading-snug group-hover:text-brand-600">{t.title}</h3>
                    {excerpt && <p className="mt-1 line-clamp-2 text-sm text-ink-500">{excerpt}</p>}
                  </Link>

                  {/* Chân: thẻ + chỉ số */}
                  <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-ink-100 pt-2.5 dark:border-ink-800">
                    <div className="flex min-w-0 flex-nowrap gap-1 overflow-x-auto no-scrollbar">
                      {t.tags.map(({ tag }) => (
                        <Link key={tag.slug} href={`/tag/${tag.slug}`} className="chip shrink-0 bg-ink-100 text-ink-500 hover:bg-brand-100 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300">#{tag.name}</Link>
                      ))}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-[12px] text-ink-400">
                      <span className="flex items-center gap-1"><Eye size={13} />{fmtCount(t.viewCount)}</span>
                      <span className="flex items-center gap-1"><MessageSquare size={13} />{fmtCount(t.replyCount)}</span>
                      <span className="flex items-center gap-1"><Heart size={13} />{fmtCount(t.likeCount)}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} basePath={tab === 'new' ? `/forum/${slug}` : `/forum/${slug}?sort=${tab}`} />
      </div>

      <div className="hidden lg:block"><HomeSidebar /></div>
    </div>
  );
}
