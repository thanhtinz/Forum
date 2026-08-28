import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { CheckCheck, Inbox, MessageSquare, Sparkles } from 'lucide-react';
import { auth } from '@/lib/auth';
import { cn, fmtCount } from '@/lib/utils';
import { getNewThreads, isNewTab, NEW_TABS, type NewTabKey } from '@/lib/new-threads';
import { ThreadRow } from '@/components/forum/ThreadRow';
import { TableHead } from '@/components/forum/TableHead';
import { Pagination } from '@/components/Pagination';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { MarkAllReadButton } from '@/components/forum/MarkAllReadButton';

export const metadata: Metadata = { title: 'Chưa đọc' };
export const dynamic = 'force-dynamic';

export default async function ChuaDocPage({ searchParams }: {
  searchParams: Promise<{ page?: string; loc?: string }>;
}) {
  const session = await auth();
  // Khách vãng lai không có mốc đọc nào nên trang này vô nghĩa với họ.
  if (!session?.user?.id) redirect('/login?callbackUrl=/chua-doc');

  const { page: pageRaw, loc: locRaw } = await searchParams;
  const tab: NewTabKey = isNewTab(locRaw) ? locRaw : 'tat-ca';
  const { rows, page, totalPages, total } = await getNewThreads(
    session.user.id, tab, Math.max(1, parseInt(pageRaw ?? '1', 10) || 1),
  );

  const duong = (t: NewTabKey) => (t === 'tat-ca' ? '/chua-doc' : `/chua-doc?loc=${t}`);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <header className="card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
            <Sparkles size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black leading-tight text-ink-900 dark:text-white">Chưa đọc</h1>
            <p className="truncate text-xs text-ink-400">
              {total > 0
                ? `Có ${fmtCount(total)} chủ đề mới kể từ lần bạn ghé.`
                : 'Bạn đã đọc hết mọi thứ. Quay lại sau nhé.'}
            </p>
          </div>
          <MarkAllReadButton />
        </header>

        <div className="mb-4 flex items-center gap-2">
          <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto rounded-full bg-ink-100 p-1 dark:bg-ink-800">
            {NEW_TABS.map((t) => (
              <Link key={t.key} href={duong(t.key)}
                className={cn('shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  tab === t.key ? 'bg-white text-brand-600 shadow-sm dark:bg-ink-700' : 'text-ink-500 hover:text-brand-600')}>
                {t.label}
              </Link>
            ))}
          </div>
        </div>

        <section className="card overflow-hidden" data-chua-doc>
          <TableHead title="Chủ đề có bài mới" icon={<MessageSquare size={15} className="text-brand-500" />}
            cols={{ last: 'Hoạt động', a: 'Trả lời', b: 'Lượt xem' }} />

          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-ink-400">
              <Inbox size={28} />
              <p>{tab === 'theo-doi'
                ? 'Không có bài mới ở những chủ đề bạn theo dõi.'
                : 'Không còn chủ đề nào chưa đọc.'}</p>
              <Link href="/" className="text-sm font-medium text-brand-600 hover:underline">Về trang diễn đàn</Link>
            </div>
          ) : (
            <div className="retro-stripe divide-y divide-ink-100 dark:divide-ink-800">
              {rows.map((t) => <ThreadRow key={t.id} thread={t} showForum />)}
            </div>
          )}
        </section>

        <div className="mt-4"><Pagination page={page} totalPages={totalPages} basePath={duong(tab)} /></div>

        {rows.length > 0 && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-400">
            <CheckCheck size={13} /> Mở một chủ đề là nó rời khỏi danh sách này.
          </p>
        )}
      </div>

      <div className="hidden lg:block lg:sticky lg:top-[72px] lg:self-start"><ForumSidebar /></div>
    </div>
  );
}
