import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowLeft, Bookmark } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { postCardInclude, toCardData } from '@/lib/post-card';
import { PostGrid } from '@/components/PostGrid';
import { Pagination } from '@/components/Pagination';

export const metadata: Metadata = { title: 'Bài viết đã lưu' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;

export default async function FavoritesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/favorites');
  const userId = session.user.id;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [total, favorites] = await Promise.all([
    db.favorite.count({ where: { userId, postId: { not: null } } }),
    db.favorite.findMany({
      where: { userId, postId: { not: null } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { post: { include: postCardInclude } },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const posts = favorites.map((f) => f.post).filter((p): p is NonNullable<typeof p> => !!p).map(toCardData);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      <div className="mb-4 flex items-center gap-2">
        <Bookmark size={22} className="text-brand-500" />
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Bài viết đã lưu</h1>
        <span className="text-sm text-ink-500">({total})</span>
      </div>

      <PostGrid posts={posts} empty="Bạn chưa lưu bài viết nào. Nhấn “Lưu” ở mỗi bài để xem lại sau." />

      {totalPages > 1 && (
        <div className="mt-6"><Pagination page={page} totalPages={totalPages} basePath="/user/favorites" /></div>
      )}
    </div>
  );
}
