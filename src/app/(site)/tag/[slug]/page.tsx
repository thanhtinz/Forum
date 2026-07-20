import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Tag as TagIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { postCardInclude, toCardData } from '@/lib/post-card';
import { PostGrid } from '@/components/PostGrid';
import { Pagination } from '@/components/Pagination';
import { HomeSidebar } from '@/components/HomeSidebar';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await db.tag.findUnique({ where: { slug }, select: { name: true } });
  return tag ? { title: `Thẻ: #${tag.name}` } : { title: 'Không tìm thấy thẻ' };
}

export default async function TagPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const tag = await db.tag.findUnique({ where: { slug } });
  if (!tag) notFound();

  const where = { status: 'PUBLISHED' as const, tags: { some: { tagId: tag.id } } };
  const [total, posts] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({
      where, orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: postCardInclude,
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <header className="card mb-5 p-5">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-950/50"><TagIcon size={17} /></span>
            #{tag.name}
          </h1>
          <p className="mt-1 text-xs text-ink-400">{total} bài viết gắn thẻ này</p>
        </header>

        <PostGrid posts={posts.map(toCardData)} empty="Chưa có bài viết nào gắn thẻ này." />
        <Pagination page={page} totalPages={totalPages} basePath={`/tag/${slug}`} />
      </div>

      <div className="hidden lg:block"><HomeSidebar /></div>
    </div>
  );
}
