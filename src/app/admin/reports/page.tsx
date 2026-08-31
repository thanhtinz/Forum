import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { db } from '@/lib/db';
import { cn, tinhSoTrang } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { ReportRowActions } from '@/components/admin/ReportRowActions';

export const metadata: Metadata = { title: 'Báo cáo' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

const STATUSES = [
  { key: 'OPEN', label: 'Chờ xử lý' },
  { key: 'RESOLVED', label: 'Đã xử lý' },
  { key: 'DISMISSED', label: 'Đã bỏ qua' },
  { key: 'ALL', label: 'Tất cả' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  RESOLVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  DISMISSED: 'bg-ink-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
};
const STATUS_LABEL: Record<string, string> = { OPEN: 'Chờ xử lý', RESOLVED: 'Đã xử lý', DISMISSED: 'Đã bỏ qua' };

function targetInfo(r: { threadId: string | null; replyId: string | null; commentId: string | null }) {
  if (r.threadId) return { label: 'Chủ đề diễn đàn', href: null };
  if (r.replyId) return { label: 'Trả lời diễn đàn', href: null };
  if (r.commentId) return { label: 'Bình luận', href: null };
  return { label: 'Không xác định', href: null };
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const { page: pageRaw, status: statusRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const status = STATUSES.some((s) => s.key === statusRaw) ? statusRaw! : 'OPEN';
  const where = status === 'ALL' ? {} : { status: status as never };

  const [total, items] = await Promise.all([
    db.report.count({ where }),
    db.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        reporter: { select: { name: true, username: true } },
      },
    }),
  ]);
  const totalPages = tinhSoTrang(total, PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">Báo cáo nội dung</h1>
          <p className="text-sm text-ink-500">{STATUSES.find((s) => s.key === status)?.label} · {total} báo cáo</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {items.length === 0 && <div className="card p-8 text-center text-sm text-ink-500">Không có báo cáo nào.</div>}
        {items.map((r) => {
          const t = targetInfo(r);
          const hasTarget = !!(r.threadId || r.replyId || r.commentId);
          return (
            <div key={r.id} className="card space-y-2.5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-950/40">{r.reason}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[r.status])}>{STATUS_LABEL[r.status]}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-ink-800 dark:text-ink-100">
                    {t.href ? <Link href={t.href} target="_blank" className="hover:text-brand-600">{t.label}</Link> : t.label}
                  </p>
                  {r.detail && <p className="mt-0.5 text-sm text-ink-500">“{r.detail}”</p>}
                  <p className="mt-1 text-xs text-ink-400">Bởi {r.reporter.name ?? r.reporter.username} · {format(r.createdAt, 'HH:mm dd/MM/yyyy')}</p>
                </div>
              </div>
              <div className="flex justify-end"><ReportRowActions id={r.id} status={r.status} hasTarget={hasTarget} /></div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={`/admin/reports?status=${status}`} />}
    </div>
  );
}
