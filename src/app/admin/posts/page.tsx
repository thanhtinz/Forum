import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { Star, ShoppingBag, Pencil } from 'lucide-react';
import { db } from '@/lib/db';
import { cn, fmtCount } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { PostRowActions } from '@/components/admin/PostRowActions';

export const metadata: Metadata = { title: 'Bài viết' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

const STATUSES = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'PUBLISHED', label: 'Đã đăng' },
  { key: 'ARCHIVED', label: 'Đã ẩn' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  ARCHIVED: 'bg-ink-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  DRAFT: 'bg-ink-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
};
const STATUS_LABEL: Record<string, string> = { PUBLISHED: 'Đã đăng', PENDING: 'Chờ duyệt', ARCHIVED: 'Đã ẩn', DRAFT: 'Nháp' };

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const { page: pageRaw, status: statusRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const status = STATUSES.some((s) => s.key === statusRaw) ? statusRaw! : 'ALL';
  const where = status === 'ALL' ? {} : { status: status as never };

  const [total, posts] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, title: true, slug: true, status: true, featured: true, createdAt: true, viewCount: true, access: true, author: { select: { name: true, username: true } } },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">Bài bán hàng</h1>
          <p className="text-sm text-ink-500">
            Nội dung của cửa hàng · {STATUSES.find((s) => s.key === status)?.label} · {fmtCount(total)} bài
          </p>
        </div>
        <Link href="/admin/posts/new" className="btn-primary !px-3.5 !py-2 text-sm">
          <ShoppingBag size={15} /> Đăng hàng cửa hàng
        </Link>
      </div>

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {posts.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Không có bài viết nào.</div>}
        {posts.map((p) => (
          <div key={p.id} className="p-3 sm:flex sm:items-center sm:gap-3">
            <div className="min-w-0 sm:flex-1">
              <div className="flex items-start gap-1.5">
                {p.featured && <Star size={13} className="mt-1 shrink-0 fill-amber-400 text-amber-400" />}
                <Link href={`/posts/${p.slug}`} target="_blank" className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-600 sm:truncate dark:text-white">{p.title}</Link>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                <span>{p.author?.name ?? p.author?.username ?? 'Ẩn danh'}</span>
                <span>·</span>
                <span>{format(p.createdAt, 'dd/MM/yyyy')}</span>
                <span>·</span>
                <span>{fmtCount(p.viewCount)} lượt xem</span>
              </div>
            </div>
            {/* Mobile: trạng thái và nút xuống hàng riêng cho khỏi bóp tiêu đề */}
            <div className="mt-2 flex items-center gap-2 sm:mt-0 sm:shrink-0">
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_BADGE[p.status] ?? STATUS_BADGE.DRAFT)}>{STATUS_LABEL[p.status] ?? p.status}</span>
              <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
                <Link href={`/user/posts/${p.id}/edit`} title="Sửa bài"
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800">
                  <Pencil size={14} />
                </Link>
                <PostRowActions id={p.id} status={p.status} featured={p.featured} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={status === 'ALL' ? '/admin/posts' : `/admin/posts?status=${status}`} />}
    </div>
  );
}
