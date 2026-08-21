import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { db } from '@/lib/db';
import { cn, fmtVnd } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { WithdrawalRowActions } from '@/components/admin/WithdrawalRowActions';

export const metadata: Metadata = { title: 'Rút tiền' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

const STATUSES = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'APPROVED', label: 'Đã duyệt' },
  { key: 'PAID', label: 'Đã trả' },
  { key: 'REJECTED', label: 'Từ chối' },
] as const;

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  APPROVED: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};
const STATUS_LABEL: Record<string, string> = { PENDING: 'Chờ xử lý', APPROVED: 'Đã duyệt', PAID: 'Đã trả', REJECTED: 'Từ chối' };

export default async function AdminWithdrawalsPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string }> }) {
  const { page: pageRaw, status: statusRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const status = STATUSES.some((s) => s.key === statusRaw) ? statusRaw! : 'ALL';
  const where = status === 'ALL' ? {} : { status: status as never };

  const [total, pendingSum, items] = await Promise.all([
    db.withdrawal.count({ where }),
    db.withdrawal.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    db.withdrawal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, username: true } } },
    }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">Yêu cầu rút tiền</h1>
          <p className="text-sm text-ink-500">{STATUSES.find((s) => s.key === status)?.label}</p>
        </div>
        <span className="text-sm text-ink-500">Đang chờ: <b className="text-amber-600">{fmtVnd(pendingSum._sum.amount ?? 0)}</b></span>
      </div>

      <div className="space-y-2.5">
        {items.length === 0 && <div className="card p-8 text-center text-sm text-ink-500">Không có yêu cầu nào.</div>}
        {items.map((w) => (
          <div key={w.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/u/${w.user.username}`} target="_blank" className="text-sm font-semibold text-ink-900 hover:text-brand-600 dark:text-white">{w.user.name ?? w.user.username}</Link>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[w.status])}>{STATUS_LABEL[w.status]}</span>
                </div>
                <div className="mt-0.5 text-xs text-ink-500">{format(w.createdAt, 'HH:mm dd/MM/yyyy')}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-600">{fmtVnd(w.amount)}</div>
                {w.fee > 0 && <div className="text-xs text-ink-400">Phí: {fmtVnd(w.fee)}</div>}
              </div>
            </div>

            <div className="grid gap-x-4 gap-y-1 rounded-lg bg-ink-50 p-3 text-xs sm:grid-cols-3 dark:bg-ink-800/50">
              <div><span className="text-ink-400">Ngân hàng: </span><b className="text-ink-700 dark:text-ink-200">{w.bankName || '—'}</b></div>
              <div><span className="text-ink-400">Số TK: </span><b className="text-ink-700 dark:text-ink-200">{w.bankAccount || '—'}</b></div>
              <div><span className="text-ink-400">Chủ TK: </span><b className="text-ink-700 dark:text-ink-200">{w.bankHolder || '—'}</b></div>
              {w.note && <div className="sm:col-span-3"><span className="text-ink-400">Ghi chú: </span>{w.note}</div>}
            </div>

            <div className="flex justify-end"><WithdrawalRowActions id={w.id} status={w.status} /></div>
          </div>
        ))}
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={status === 'ALL' ? '/admin/withdrawals' : `/admin/withdrawals?status=${status}`} />}
    </div>
  );
}
