import type { Metadata } from 'next';
import { Search as SearchIcon } from 'lucide-react';
import { db } from '@/lib/db';
import { postCardInclude, toCardData } from '@/lib/post-card';
import { PostGrid } from '@/components/PostGrid';
import { Pagination } from '@/components/Pagination';
import { HomeSidebar } from '@/components/HomeSidebar';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;

export const metadata: Metadata = { title: 'Tìm kiếm' };

export default async function SearchPage({ searchParams }: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q: qRaw, page: pageRaw } = await searchParams;
  const q = (qRaw ?? '').trim();
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const where = q
    ? {
        status: 'PUBLISHED' as const,
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { excerpt: { contains: q, mode: 'insensitive' as const } },
          { content: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : { status: 'PUBLISHED' as const, id: 'none' };

  const [total, posts] = q
    ? await Promise.all([
        db.post.count({ where }),
        db.post.findMany({ where, orderBy: [{ publishedAt: 'desc' }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: postCardInclude }),
      ])
    : [0, []];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <header className="card mb-5 p-5">
          <form action="/search" className="relative">
            <SearchIcon size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="q" defaultValue={q} placeholder="Tìm bài viết…" className="input pl-10" autoFocus />
          </form>
          {q && <p className="mt-3 text-sm text-ink-500">Tìm thấy <b>{total}</b> kết quả cho “<b>{q}</b>”</p>}
        </header>

        {q
          ? <><PostGrid posts={posts.map(toCardData)} empty={`Không tìm thấy bài viết nào cho “${q}”.`} />
              <Pagination page={page} totalPages={totalPages} basePath={`/search?q=${encodeURIComponent(q)}`} /></>
          : <div className="card p-12 text-center text-ink-400">Nhập từ khoá để tìm bài viết.</div>}
      </div>

      <div className="hidden lg:block"><HomeSidebar /></div>
    </div>
  );
}
