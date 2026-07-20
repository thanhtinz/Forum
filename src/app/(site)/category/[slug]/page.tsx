import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { FolderOpen } from 'lucide-react';
import { db } from '@/lib/db';
import { postCardInclude, toCardData } from '@/lib/post-card';
import { PostGrid } from '@/components/PostGrid';
import { Pagination } from '@/components/Pagination';
import { HomeSidebar } from '@/components/HomeSidebar';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await db.category.findUnique({ where: { slug }, select: { name: true, description: true } });
  return cat ? { title: `Chuyên mục: ${cat.name}`, description: cat.description ?? undefined } : { title: 'Không tìm thấy chuyên mục' };
}

export default async function CategoryPage({ params, searchParams }: {
  params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const category = await db.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { name: true, slug: true } },
      children: { orderBy: { order: 'asc' }, select: { name: true, slug: true, color: true } },
    },
  });
  if (!category) notFound();

  const where = { status: 'PUBLISHED' as const, categories: { some: { categoryId: category.id } } };
  const [total, posts] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({
      where, orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: postCardInclude,
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <header className="card mb-5 p-5">
          <nav className="mb-1 flex items-center gap-1.5 text-sm text-ink-400">
            <Link href="/" className="hover:text-brand-600">Trang chủ</Link>
            {category.parent && <><span>/</span><Link href={`/category/${category.parent.slug}`} className="hover:text-brand-600">{category.parent.name}</Link></>}
          </nav>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ backgroundColor: category.color || '#2c7bfe' }}><FolderOpen size={17} /></span>
            {category.name}
          </h1>
          {category.description && <p className="mt-1.5 text-sm text-ink-500">{category.description}</p>}
          <p className="mt-1 text-xs text-ink-400">{total} bài viết</p>

          {category.children.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-100 pt-3 dark:border-ink-800">
              {category.children.map((c) => (
                <Link key={c.slug} href={`/category/${c.slug}`}
                  className="chip gap-1 font-medium" style={{ backgroundColor: `${c.color || '#2c7bfe'}1f`, color: c.color || '#2c7bfe' }}>
                  <FolderOpen size={11} /> {c.name}
                </Link>
              ))}
            </div>
          )}
        </header>

        <PostGrid posts={posts.map(toCardData)} empty="Chuyên mục này chưa có bài viết." />
        <Pagination page={page} totalPages={totalPages} basePath={`/category/${slug}`} />
      </div>

      <div className="hidden lg:block"><HomeSidebar /></div>
    </div>
  );
}
