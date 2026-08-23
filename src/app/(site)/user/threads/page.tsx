import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowLeft, Bell, MessageSquare, Eye } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fmtCount } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { UnfollowThreadButton } from '@/components/forum/UnfollowThreadButton';

export const metadata: Metadata = { title: 'Chủ đề đang theo dõi' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

const when = (d: Date | null) =>
  d ? d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default async function FollowedThreadsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/threads');
  const userId = session.user.id;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const where = { userId, thread: { status: 'PUBLISHED' as const } };
  const [total, rows] = await Promise.all([
    db.threadFollow.count({ where }),
    db.threadFollow.findMany({
      where,
      // Chủ đề vừa có người trả lời nằm trên cùng — đó là lý do theo dõi.
      orderBy: { thread: { lastReplyAt: 'desc' } },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        thread: {
          select: {
            id: true, title: true, replyCount: true, viewCount: true, lastReplyAt: true,
            forum: { select: { slug: true, name: true } },
          },
        },
      },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      <div className="mb-4 flex items-center gap-2">
        <Bell size={22} className="text-brand-500" />
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Chủ đề đang theo dõi</h1>
        <span className="text-sm text-ink-500">({total})</span>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          Bạn chưa theo dõi chủ đề nào. Mở một chủ đề rồi bấm <strong>Theo dõi</strong> để được báo khi có trả lời mới.
          <br />Chủ đề bạn tự đăng hoặc đã trả lời sẽ được theo dõi sẵn.
        </div>
      ) : (
        <div className="card divide-y divide-ink-100 dark:divide-ink-800">
          {rows.map(({ thread: t }) => (
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
              <UnfollowThreadButton threadId={t.id} title={t.title} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath="/user/threads" />}
    </div>
  );
}
