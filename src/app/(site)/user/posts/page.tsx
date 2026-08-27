import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, FileText, PenLine, Eye, Coins } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { cn, fmtCount, fmtVnd } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { MyPostActions } from '@/components/write/MyPostActions';

export const metadata: Metadata = { title: 'Bài viết của tôi' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 15;

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  ARCHIVED: 'bg-ink-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  DRAFT: 'bg-ink-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
};
const STATUS_LABEL: Record<string, string> = { PUBLISHED: 'Đã đăng', PENDING: 'Chờ duyệt', ARCHIVED: 'Đã ẩn', DRAFT: 'Nháp' };

export default async function MyPostsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/posts');
  const userId = session.user.id;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [total, posts, earned] = await Promise.all([
    db.post.count({ where: { authorId: userId } }),
    db.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, slug: true, title: true, status: true, access: true, createdAt: true,
        viewCount: true, commentCount: true, pricePoints: true,
        _count: { select: { orders: true } },
      },
    }),
    db.order.aggregate({ where: { post: { authorId: userId }, status: 'PAID' }, _count: true }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={22} className="text-brand-500" />
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">Bài viết của tôi</h1>
          <span className="text-sm text-ink-500">({total})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-500">Đã bán: <b className="text-emerald-600">{fmtCount(earned._count)}</b> lượt</span>
          <Link href="/user/write" className="btn-primary !px-3 !py-1.5 text-sm"><PenLine size={15} /> Đăng bài</Link>
        </div>
      </div>

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {posts.length === 0 && (
          <div className="p-10 text-center text-sm text-ink-400">
            Bạn chưa đăng bài nào. <Link href="/user/write" className="text-brand-600 hover:underline">Viết bài đầu tiên</Link>.
          </div>
        )}
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              <Link href={`/posts/${p.slug}`} className="line-clamp-1 text-sm font-semibold text-ink-900 hover:text-brand-600 dark:text-white">{p.title}</Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                <span>{format(p.createdAt, 'dd/MM/yyyy')}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Eye size={12} /> {fmtCount(p.viewCount)}</span>
                {p._count.orders > 0 && (
                  <><span>·</span><span className="flex items-center gap-1 text-emerald-600"><Coins size={12} /> {p._count.orders} lượt bán</span></>
                )}
                {p.access === 'POINTS' && p.pricePoints != null && <><span>·</span><span>{p.pricePoints} điểm</span></>}
              </div>
            </div>
            <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_BADGE[p.status] ?? STATUS_BADGE.DRAFT)}>
              {STATUS_LABEL[p.status] ?? p.status}
            </span>
            <MyPostActions id={p.id} />
          </div>
        ))}
      </div>

      {totalPages > 1 && <div className="mt-6"><Pagination page={page} totalPages={totalPages} basePath="/user/posts" /></div>}
    </div>
  );
}
