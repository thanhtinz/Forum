import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Download, FileDown } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fmtBytes } from '@/lib/utils';
import { dailyDownloadLimit, todayDownloadCount } from '@/lib/downloads';
import { Pagination } from '@/components/Pagination';

export const metadata: Metadata = { title: 'Lịch sử tải xuống' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

export default async function DownloadsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/downloads');
  const userId = session.user.id;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { level: true },
  });
  if (!user) redirect('/login');

  const [total, logs, usedTodayCount] = await Promise.all([
    db.downloadLog.count({ where: { userId } }),
    db.downloadLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        item: {
          select: {
            label: true, sizeBytes: true, version: true, provider: true,
            post: { select: { title: true, slug: true } },
          },
        },
      },
    }),
    todayDownloadCount(userId),
  ]);
  const limit = dailyDownloadLimit(user);
  const unlimited = limit === Infinity;
  const remaining = unlimited ? Infinity : Math.max(0, limit - usedTodayCount);
  const percent = unlimited ? 0 : Math.min(100, Math.round((usedTodayCount / limit) * 100));

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      <div className="mb-4 flex items-center gap-2">
        <Download size={22} className="text-brand-500" />
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Lịch sử tải xuống</h1>
        <span className="text-sm text-ink-500">({total})</span>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Hạn mức hôm nay</h2>
          <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">
            {unlimited ? `${usedTodayCount} lượt · không giới hạn` : `${usedTodayCount}/${limit} lượt`}
          </span>
        </div>
        {!unlimited && (
          <>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
              <div className={`h-full rounded-full ${percent >= 100 ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${percent}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-400">
              Còn {remaining} lượt trong hôm nay (đặt lại lúc 00:00 giờ Việt Nam).{' '}
              Lên cấp để được tải nhiều hơn mỗi ngày.
            </p>
          </>
        )}
        {unlimited && <p className="mt-2 text-xs text-ink-400">Hạng VIP của bạn được tải không giới hạn.</p>}
      </section>

      <section className="card mt-4 divide-y divide-ink-100 dark:divide-ink-800">
        {logs.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-400">Bạn chưa tải tệp nào.</p>
        ) : logs.map((log) => (
          <div key={log.id} className="flex items-center gap-3 p-3.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40">
              <FileDown size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-ink-900 dark:text-white">{log.item.label}</div>
              <div className="truncate text-xs text-ink-400">
                {log.item.post
                  ? <Link href={`/posts/${log.item.post.slug}`} className="hover:text-brand-600">{log.item.post.title}</Link>
                  : 'Bài viết đã bị xoá'}
                {log.item.version ? ` · ${/^v/i.test(log.item.version) ? log.item.version : `v${log.item.version}`}` : ''}
                {log.item.sizeBytes ? ` · ${fmtBytes(log.item.sizeBytes)}` : ''}
              </div>
            </div>
            <time className="shrink-0 text-xs text-ink-400">{format(log.createdAt, 'dd/MM/yyyy HH:mm')}</time>
          </div>
        ))}
      </section>

      {total > PAGE_SIZE && (
        <div className="mt-6"><Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} basePath="/user/downloads" /></div>
      )}
    </div>
  );
}
