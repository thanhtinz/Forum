import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Wallet, Snowflake } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { cn, fmtVnd } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { WithdrawForm } from '@/components/user/WithdrawForm';

export const metadata: Metadata = { title: 'Rút tiền' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  APPROVED: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};
const STATUS_LABEL: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', PAID: 'Đã trả', REJECTED: 'Từ chối' };

export default async function WithdrawPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/withdraw');
  const userId = session.user.id;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [user, total, items] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { balance: true, frozenBalance: true } }),
    db.withdrawal.count({ where: { userId } }),
    db.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/user/balance" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Số dư</Link>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center gap-2 text-emerald-500"><Wallet size={18} /><span className="text-sm text-ink-500">Số dư khả dụng</span></div>
          <div className="mt-1 text-2xl font-black">{fmtVnd(user?.balance ?? 0)}</div>
        </section>
        <section className="card p-5">
          <div className="flex items-center gap-2 text-sky-500"><Snowflake size={18} /><span className="text-sm text-ink-500">Đang chờ rút</span></div>
          <div className="mt-1 text-2xl font-black">{fmtVnd(user?.frozenBalance ?? 0)}</div>
        </section>
      </div>

      <section className="card mt-5 p-5">
        <h1 className="mb-3 font-bold">Yêu cầu rút tiền</h1>
        <WithdrawForm balance={user?.balance ?? 0} />
      </section>

      <section className="card mt-5 p-5">
        <h2 className="mb-3 font-bold">Lịch sử rút tiền ({total})</h2>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">Bạn chưa có yêu cầu rút tiền nào.</p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {items.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{fmtVnd(w.amount)}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_BADGE[w.status])}>{STATUS_LABEL[w.status]}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-400">{w.bankName} · {w.bankAccount} · {format(w.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                </div>
                {w.processedAt && <span className="shrink-0 text-xs text-ink-400">Xử lý {format(w.processedAt, 'dd/MM/yyyy')}</span>}
              </li>
            ))}
          </ul>
        )}
        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath="/user/withdraw" />}
      </section>
    </div>
  );
}
