import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { Pin, Lock } from 'lucide-react';
import { db } from '@/lib/db';
import { cn, fmtCount } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { ThreadRowActions } from '@/components/admin/ThreadRowActions';

export const metadata: Metadata = { title: 'Chủ đề diễn đàn' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

const STATUSES = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'PUBLISHED', label: 'Đang hiện' },
  { key: 'HIDDEN', label: 'Đã ẩn' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  HIDDEN: 'bg-ink-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  DELETED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};
const STATUS_LABEL: Record<string, string> = { PUBLISHED: 'Đang hiện', PENDING: 'Chờ duyệt', HIDDEN: 'Đã ẩn', DELETED: 'Đã xoá' };

export default async function AdminThreadsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; forum?: string }> }) {
  const { page: pageRaw, status: statusRaw, forum: forumRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const status = STATUSES.some((s) => s.key === statusRaw) ? statusRaw! : 'ALL';

  const where = {
    ...(status === 'ALL' ? {} : { status: status as never }),
    ...(forumRaw ? { forum: { slug: forumRaw } } : {}),
  };

  const [total, threads, forums] = await Promise.all([
    db.thread.count({ where }),
    db.thread.findMany({
      where,
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, title: true, status: true, pinned: true, locked: true, createdAt: true,
        viewCount: true, replyCount: true,
        forum: { select: { name: true, slug: true } },
        author: { select: { name: true, username: true } },
      },
    }),
    db.forum.findMany({ orderBy: { order: 'asc' }, select: { name: true, slug: true } }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Giữ nguyên bộ lọc khu vực khi chuyển trang.
  const qs = new URLSearchParams();
  if (status !== 'ALL') qs.set('status', status);
  if (forumRaw) qs.set('forum', forumRaw);
  const basePath = qs.toString() ? `/admin/threads?${qs}` : '/admin/threads';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Quản lý chủ đề</h1>
        <p className="text-sm text-ink-500">
          Bài do thành viên đăng trong diễn đàn · {STATUSES.find((s) => s.key === status)?.label} · {fmtCount(total)} chủ đề
        </p>
      </div>

      {/* Lọc theo khu vực — dùng ô chọn để không thành hàng tab */}
      {forums.length > 0 && (
        <form method="get" className="card flex flex-wrap items-center gap-2 p-3">
          {status !== 'ALL' && <input type="hidden" name="status" value={status} />}
          <label htmlFor="forum-filter" className="text-sm font-medium text-ink-600 dark:text-ink-300">Khu vực</label>
          <select id="forum-filter" name="forum" defaultValue={forumRaw ?? ''} className="input !w-auto min-w-52">
            <option value="">Mọi khu vực</option>
            {forums.map((f) => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
          <button type="submit" className="btn-primary !px-3.5 !py-2 text-sm">Lọc</button>
          {forumRaw && (
            <Link href={status === 'ALL' ? '/admin/threads' : `/admin/threads?status=${status}`}
              className="text-sm text-ink-500 hover:text-brand-600">Bỏ lọc</Link>
          )}
        </form>
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {threads.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Không có chủ đề nào.</div>}
        {threads.map((t) => (
          <div key={t.id} className="p-3 sm:flex sm:items-center sm:gap-3">
            <div className="min-w-0 sm:flex-1">
              <div className="flex items-start gap-1.5">
                {t.pinned && <Pin size={13} className="mt-1 shrink-0 text-brand-500" />}
                {t.locked && <Lock size={13} className="mt-1 shrink-0 text-ink-400" />}
                <Link href={`/forum/${t.forum.slug}/${t.id}`} target="_blank"
                  className="line-clamp-2 text-sm font-semibold text-ink-900 hover:text-brand-600 sm:truncate dark:text-white">{t.title}</Link>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                <span>{t.forum.name}</span>
                <span>·</span>
                <span>{t.author?.name ?? t.author?.username ?? 'Ẩn danh'}</span>
                <span>·</span>
                <span>{format(t.createdAt, 'dd/MM/yyyy')}</span>
                <span>·</span>
                <span>{fmtCount(t.replyCount)} trả lời</span>
                <span>·</span>
                <span>{fmtCount(t.viewCount)} lượt xem</span>
              </div>
            </div>
            {/* Mobile: trạng thái và nút xuống hàng riêng cho khỏi bóp tiêu đề */}
            <div className="mt-2 flex items-center gap-2 sm:mt-0 sm:shrink-0">
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_BADGE[t.status] ?? STATUS_BADGE.HIDDEN)}>
                {STATUS_LABEL[t.status] ?? t.status}
              </span>
              <div className="ml-auto sm:ml-0">
                <ThreadRowActions id={t.id} status={t.status} pinned={t.pinned} locked={t.locked} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={basePath} />}
    </div>
  );
}
