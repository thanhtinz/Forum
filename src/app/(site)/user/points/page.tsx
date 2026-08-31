import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Coins } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fmtCount, tinhSoTrang } from '@/lib/utils';
import { POINTS_REASON_LABEL } from '@/lib/labels';
import { Pagination } from '@/components/Pagination';

export const metadata: Metadata = { title: 'Lịch sử điểm' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

export default async function PointsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/points');
  const userId = session.user.id;
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [user, total, logs, earned, spent] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { points: true } }),
    db.pointsLog.count({ where: { userId } }),
    db.pointsLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.pointsLog.aggregate({ where: { userId, amount: { gt: 0 } }, _sum: { amount: true } }),
    db.pointsLog.aggregate({ where: { userId, amount: { lt: 0 } }, _sum: { amount: true } }),
  ]);
  const totalPages = tinhSoTrang(total, PAGE_SIZE);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      <section className="card p-5">
        <div className="flex items-center gap-2 text-amber-500"><Coins size={18} /><span className="text-sm text-ink-500">Điểm hiện có</span></div>
        <div className="mt-1 text-3xl font-black">{fmtCount(user?.points ?? 0)}</div>
        <div className="mt-3 flex gap-6 border-t border-ink-100 pt-3 text-sm dark:border-ink-800">
          <span className="text-ink-500">Tổng nhận: <b className="text-green-600">+{fmtCount(earned._sum.amount ?? 0)}</b></span>
          <span className="text-ink-500">Tổng tiêu: <b className="text-red-600">{fmtCount(spent._sum.amount ?? 0)}</b></span>
        </div>
      </section>

      <section className="card mt-5 p-5">
        <h1 className="mb-3 font-bold">Lịch sử điểm ({total})</h1>
        {logs.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-400">Chưa có biến động điểm nào.</p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-3">
                {/* `min-w-0` phải có ở ĐÂY nữa, không chỉ ở thẻ con: thiếu nó
                    thì mục flex này không co được, dòng ghi chú dài đẩy cả hàng
                    rộng ra và cả trang cuộn ngang được. */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${l.amount >= 0 ? 'bg-green-50 text-green-600 dark:bg-green-950/40' : 'bg-red-50 text-red-600 dark:bg-red-950/40'}`}>
                    {l.amount >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{POINTS_REASON_LABEL[l.reason] ?? l.reason}</p>
                    <p className="truncate text-xs text-ink-400">{l.note ?? '—'} · {format(l.createdAt, 'dd/MM/yyyy HH:mm')}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-bold ${l.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{l.amount >= 0 ? '+' : ''}{fmtCount(l.amount)}</div>
                  <div className="text-xs text-ink-400">Dư {fmtCount(l.balance)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} totalPages={totalPages} basePath="/user/points" />
      </section>
    </div>
  );
}
