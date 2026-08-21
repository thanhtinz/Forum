import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, Wallet, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fmtVnd } from '@/lib/utils';
import { BALANCE_REASON_LABEL } from '@/lib/labels';
import { Pagination } from '@/components/Pagination';
import { TopupForm } from '@/components/user/TopupForm';

export const metadata: Metadata = { title: 'Số dư & Nạp tiền' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

export default async function BalancePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/balance');
  const userId = session.user.id;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [user, total, logs, pending] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { balance: true, frozenBalance: true } }),
    db.balanceLog.count({ where: { userId } }),
    db.balanceLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.order.findMany({ where: { userId, type: 'TOPUP', status: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 3, select: { code: true, amount: true, createdAt: true } }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      <section className="card p-5">
        <div className="flex items-center gap-2 text-green-500"><Wallet size={18} /><span className="text-sm text-ink-500">Số dư khả dụng</span></div>
        <div className="mt-1 text-3xl font-black">{fmtVnd(user?.balance ?? 0)}</div>
        {(user?.frozenBalance ?? 0) > 0 && <p className="mt-1 text-sm text-ink-400">Đang chờ rút: {fmtVnd(user?.frozenBalance)}</p>}
        <Link href="/user/withdraw" className="btn-ghost mt-3 !px-3 !py-1.5 text-sm"><ArrowDownRight size={15} /> Rút tiền</Link>
      </section>

      {/* Nạp tiền */}
      <section className="card mt-5 p-5">
        <h1 className="mb-3 font-bold">Nạp tiền</h1>
        <TopupForm />
        {pending.length > 0 && (
          <div className="mt-4 border-t border-ink-100 pt-3 dark:border-ink-800">
            <p className="mb-2 text-xs font-semibold text-ink-400">Đơn nạp đang chờ</p>
            <ul className="space-y-1.5">
              {pending.map((o) => (
                <li key={o.code} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 text-ink-500"><Clock size={13} /> {o.code}</span>
                  <span className="font-semibold">{fmtVnd(o.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Lịch sử số dư */}
      <section className="card mt-5 p-5">
        <h2 className="mb-3 font-bold">Lịch sử số dư ({total})</h2>
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">Chưa có biến động số dư nào.</p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${l.amount >= 0 ? 'bg-green-50 text-green-600 dark:bg-green-950/40' : 'bg-red-50 text-red-600 dark:bg-red-950/40'}`}>
                    {l.amount >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{BALANCE_REASON_LABEL[l.reason] ?? l.reason}</p>
                    <p className="truncate text-xs text-ink-400">{l.note ?? '—'} · {format(l.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-bold ${l.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{l.amount >= 0 ? '+' : ''}{fmtVnd(l.amount)}</div>
                  <div className="text-xs text-ink-400">Dư {fmtVnd(l.balance)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={totalPages} basePath="/user/balance" />
      </section>
    </div>
  );
}
