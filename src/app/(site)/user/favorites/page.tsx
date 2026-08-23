import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowLeft, Bookmark, MessageSquare, Eye } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { cn, fmtCount } from '@/lib/utils';
import { postCardSelect, toCardData } from '@/lib/post-card';
import { PostGrid } from '@/components/PostGrid';
import { Pagination } from '@/components/Pagination';
import { UnsaveThreadButton } from '@/components/forum/UnsaveThreadButton';

export const metadata: Metadata = { title: 'Đã lưu' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;

const TABS = [
  { key: 'posts', label: 'Bài viết' },
  { key: 'threads', label: 'Chủ đề' },
] as const;

const when = (d: Date | null) =>
  d ? d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default async function FavoritesPage({ searchParams }: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/favorites');
  const userId = session.user.id;
  const { page: pageRaw, tab: tabRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const tab = TABS.find((t) => t.key === tabRaw) ?? TABS[0];

  // Đếm cả hai mục để hiện số ngay trên thẻ chọn.
  const [postTotal, threadTotal] = await Promise.all([
    db.favorite.count({ where: { userId, postId: { not: null } } }),
    db.favorite.count({ where: { userId, threadId: { not: null }, thread: { status: 'PUBLISHED' } } }),
  ]);
  const total = tab.key === 'posts' ? postTotal : threadTotal;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const skip = (page - 1) * PAGE_SIZE;

  const posts = tab.key === 'posts'
    ? (await db.favorite.findMany({
        where: { userId, postId: { not: null } },
        orderBy: { createdAt: 'desc' }, skip, take: PAGE_SIZE,
        select: { post: { select: postCardSelect } },
      })).map((f) => f.post).filter((p): p is NonNullable<typeof p> => !!p).map(toCardData)
    : [];

  const threads = tab.key === 'threads'
    ? (await db.favorite.findMany({
        where: { userId, threadId: { not: null }, thread: { status: 'PUBLISHED' } },
        orderBy: { createdAt: 'desc' }, skip, take: PAGE_SIZE,
        select: {
          thread: {
            select: {
              id: true, title: true, replyCount: true, viewCount: true, lastReplyAt: true,
              forum: { select: { slug: true, name: true } },
            },
          },
        },
      })).map((f) => f.thread).filter((t): t is NonNullable<typeof t> => !!t)
    : [];

  const tabHref = (key: string) => (key === 'posts' ? '/user/favorites' : `/user/favorites?tab=${key}`);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      <div className="mb-3 flex items-center gap-2">
        <Bookmark size={22} className="text-brand-500" />
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Đã lưu</h1>
      </div>

      <div className="mb-4 flex gap-1.5">
        {TABS.map((t) => (
          <Link key={t.key} href={tabHref(t.key)}
            className={cn('rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              t.key === tab.key
                ? 'border-brand-500 bg-brand-500 font-medium text-white'
                : 'border-ink-200 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800')}>
            {t.label} <span className="opacity-70">{t.key === 'posts' ? postTotal : threadTotal}</span>
          </Link>
        ))}
      </div>

      {tab.key === 'posts' ? (
        <PostGrid posts={posts} empty="Bạn chưa lưu bài viết nào. Nhấn “Lưu” ở mỗi bài để xem lại sau." />
      ) : threads.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          Bạn chưa lưu chủ đề nào. Mở một chủ đề rồi bấm <strong>Lưu</strong> để đọc lại sau.
        </div>
      ) : (
        <div className="card divide-y divide-ink-100 dark:divide-ink-800">
          {threads.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <Link href={`/forum/${t.forum.slug}/${t.id}`}
                  className="block truncate font-semibold text-ink-900 hover:text-brand-600 dark:text-white">
                  {t.title}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-400">
                  <Link href={`/forum/${t.forum.slug}`} className="hover:text-brand-600">{t.forum.name}</Link>
                  <span className="flex items-center gap-1"><MessageSquare size={12} />{fmtCount(t.replyCount)}</span>
                  <span className="flex items-center gap-1"><Eye size={12} />{fmtCount(t.viewCount)}</span>
                  <span>Trả lời cuối: {when(t.lastReplyAt)}</span>
                </p>
              </div>
              <UnsaveThreadButton threadId={t.id} title={t.title} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6"><Pagination page={page} totalPages={totalPages} basePath={tabHref(tab.key)} /></div>
      )}
    </div>
  );
}
