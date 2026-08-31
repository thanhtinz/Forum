import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Tag as TagIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { ThreadRow, type ThreadRowData } from '@/components/forum/ThreadRow';
import { Pagination } from '@/components/Pagination';
import { HomeSidebar } from '@/components/HomeSidebar';
import { authorChipSelect, toAuthorChip } from '@/lib/shop';
import { unreadThreadIds } from '@/lib/thread-read';
import { threadExcerpt } from '@/lib/bbcode';
import { fmtCount, tinhSoTrang } from '@/lib/utils';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await db.tag.findUnique({ where: { slug }, select: { name: true } });
  return tag ? { title: `Thẻ: #${tag.name}` } : { title: 'Không tìm thấy thẻ' };
}

/** Các chủ đề gắn một thẻ. Trước đây trang này liệt kê bài viết — mục ấy đã gỡ. */
export default async function TagPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const tag = await db.tag.findUnique({ where: { slug } });
  if (!tag) notFound();

  // Cùng lý do với tìm kiếm: khu vực đặt huy hiệu bắt buộc thì loại khỏi
  // danh sách theo thẻ, không mang huy hiệu người xem vào đây để so từng dòng.
  const where = {
    status: 'PUBLISHED' as const, tags: { some: { tagId: tag.id } },
    forum: { requiredMedalId: null },
  };
  const [total, threads] = await Promise.all([
    db.thread.count({ where }),
    db.thread.findMany({
      where,
      orderBy: [{ lastReplyAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { author: { select: authorChipSelect }, forum: { select: { slug: true, name: true } } },
    }),
  ]);

  const session = await auth();
  const unread = await unreadThreadIds(session?.user?.id ?? null, threads);
  const totalPages = tinhSoTrang(total, PAGE_SIZE);

  const rows: ThreadRowData[] = threads.map((t) => ({
    id: t.id, title: t.title, createdAt: t.createdAt, lastReplyAt: t.lastReplyAt,
    pinned: t.pinned, locked: t.locked, solved: !!t.solvedReplyId, bountyPoints: t.bountyPoints,
    viewCount: t.viewCount, replyCount: t.replyCount, author: toAuthorChip(t.author),
    forum: t.forum,
    excerpt: threadExcerpt(t.content),
    unread: unread.has(t.id),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <header className="card mb-5 p-5">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-950/50"><TagIcon size={17} /></span>
            #{tag.name}
          </h1>
          <p className="mt-1 text-xs text-ink-400">{fmtCount(total)} chủ đề gắn thẻ này</p>
        </header>

        {rows.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-500">Chưa có chủ đề nào gắn thẻ này.</div>
        ) : (
          <div className="card divide-y divide-ink-100 dark:divide-ink-800">
            {rows.map((t) => <ThreadRow key={t.id} thread={t} forumSlug={t.forum?.slug ?? ''} />)}
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} basePath={`/tag/${slug}`} />
      </div>

      <div className="hidden lg:block"><HomeSidebar /></div>
    </div>
  );
}
