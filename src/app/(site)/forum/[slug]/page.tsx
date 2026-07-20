import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { MessagesSquare, Pin, Lock, MessageSquare, Eye, Award, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/db';
import { fmtCount } from '@/lib/utils';
import { FORUM_ACCESS_BADGE } from '@/lib/forum';
import { Pagination } from '@/components/Pagination';
import { HomeSidebar } from '@/components/HomeSidebar';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 15;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const forum = await db.forum.findUnique({ where: { slug }, select: { name: true, description: true } });
  return forum ? { title: `Diễn đàn: ${forum.name}`, description: forum.description ?? undefined } : { title: 'Không tìm thấy diễn đàn' };
}

export default async function ForumPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const forum = await db.forum.findUnique({
    where: { slug },
    include: {
      parent: { select: { name: true, slug: true } },
      children: { orderBy: { order: 'asc' }, select: { slug: true, name: true, icon: true } },
    },
  });
  if (!forum) notFound();

  const where = { forumId: forum.id, status: 'PUBLISHED' as const };
  const [total, threads] = await Promise.all([
    db.thread.count({ where }),
    db.thread.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { lastReplyAt: 'desc' }, { createdAt: 'desc' }],
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

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <header className="card mb-5 p-5">
          <nav className="mb-1 flex items-center gap-1.5 text-sm text-ink-400">
            <Link href="/forum" className="hover:text-brand-600">Diễn đàn</Link>
            {forum.parent && <><span>/</span><Link href={`/forum/${forum.parent.slug}`} className="hover:text-brand-600">{forum.parent.name}</Link></>}
          </nav>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
              {forum.icon ?? <MessagesSquare size={17} />}
            </span>
            {forum.name}
            {badge && <span className={`chip ${badge.className}`}>{badge.label}</span>}
          </h1>
          {forum.description && <p className="mt-1.5 text-sm text-ink-500">{forum.description}</p>}
          <p className="mt-1 text-xs text-ink-400">{fmtCount(forum.threadCount)} chủ đề · {fmtCount(forum.replyCount)} trả lời</p>

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

        {threads.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center text-ink-400">
            <MessageSquare size={28} />
            <p>Diễn đàn này chưa có chủ đề nào.</p>
          </div>
        ) : (
          <ul className="card divide-y divide-ink-100 overflow-hidden dark:divide-ink-800">
            {threads.map((t) => {
              const name = t.author?.name ?? t.author?.username ?? 'Ẩn danh';
              return (
                <li key={t.id} className="flex items-start gap-3 p-4">
                  <Link href={`/u/${t.author?.username ?? ''}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {t.author?.image
                      ? <img src={t.author.image} alt="" className="h-10 w-10 rounded-full object-cover" />
                      : <span className="grid h-10 w-10 place-items-center rounded-full bg-ink-200 font-bold text-ink-600 dark:bg-ink-700 dark:text-ink-200">{name[0]?.toUpperCase()}</span>}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {t.pinned && <Pin size={14} className="text-brand-600" aria-label="Đã ghim" />}
                      {t.locked && <Lock size={13} className="text-ink-400" aria-label="Đã khoá" />}
                      {t.solvedReplyId && <CheckCircle2 size={14} className="text-emerald-500" aria-label="Đã giải quyết" />}
                      <Link href={`/forum/${forum.slug}/${t.id}`} className="font-semibold hover:text-brand-600">{t.title}</Link>
                      {t.bountyPoints ? <span className="chip gap-1 bg-amber-100 text-amber-600 dark:bg-amber-950/50"><Award size={11} />{fmtCount(t.bountyPoints)}đ</span> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                      <span>{name}</span>
                      <span>{format(t.lastReplyAt ?? t.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                      {t.tags.map(({ tag }) => (
                        <Link key={tag.slug} href={`/tag/${tag.slug}`} className="chip bg-ink-100 !py-0 text-ink-500 hover:text-brand-600 dark:bg-ink-800">#{tag.name}</Link>
                      ))}
                    </div>
                  </div>
                  <div className="hidden shrink-0 flex-col items-end gap-1 text-xs text-ink-400 sm:flex">
                    <span className="flex items-center gap-1"><MessageSquare size={12} />{fmtCount(t.replyCount)}</span>
                    <span className="flex items-center gap-1"><Eye size={12} />{fmtCount(t.viewCount)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination page={page} totalPages={totalPages} basePath={`/forum/${slug}`} />
      </div>

      <div className="hidden lg:block"><HomeSidebar /></div>
    </div>
  );
}
