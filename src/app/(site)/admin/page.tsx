import Link from 'next/link';
import { Users, FileText, Clock, ShoppingCart, Flag, Wallet, Coins, Banknote } from 'lucide-react';
import { db } from '@/lib/db';
import { fmtVnd, fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';

async function getStats() {
  const [users, posts, pending, orders, threads, pendingWithdrawals, openReports, revenueAgg, commissionAgg] = await Promise.all([
    db.user.count(),
    db.post.count(),
    db.post.count({ where: { status: 'PENDING' } }),
    db.order.count({ where: { status: 'PAID' } }),
    db.thread.count(),
    db.withdrawal.count({ where: { status: 'PENDING' } }),
    db.report.count({ where: { status: 'OPEN' } }),
    db.order.aggregate({ where: { status: 'PAID' }, _sum: { finalAmount: true } }),
    db.commission.aggregate({ _sum: { amount: true } }),
  ]);
  return {
    users, posts, pending, orders, threads, pendingWithdrawals, openReports,
    revenue: revenueAgg._sum.finalAmount ?? 0,
    commission: commissionAgg._sum.amount ?? 0,
  };
}

const CARDS = (s: Awaited<ReturnType<typeof getStats>>) => [
  { label: 'Thành viên', value: fmtCount(s.users), icon: Users, tint: 'text-sky-500', href: '/admin/users' },
  { label: 'Bài viết', value: fmtCount(s.posts), icon: FileText, tint: 'text-violet-500', href: '/admin/posts' },
  { label: 'Chờ duyệt', value: fmtCount(s.pending), icon: Clock, tint: 'text-amber-500', href: '/admin/posts?status=PENDING' },
  { label: 'Đơn đã thanh toán', value: fmtCount(s.orders), icon: ShoppingCart, tint: 'text-emerald-500' },
  { label: 'Báo cáo chờ xử lý', value: fmtCount(s.openReports), icon: Flag, tint: 'text-red-500', href: '/admin/reports' },
  { label: 'Yêu cầu rút tiền', value: fmtCount(s.pendingWithdrawals), icon: Banknote, tint: 'text-orange-500', href: '/admin/withdrawals' },
];

export default async function AdminDashboard() {
  const s = await getStats();
  const cards = CARDS(s);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Bảng điều khiển</h1>
        <p className="text-sm text-ink-500">Tổng quan hoạt động của nền tảng.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          const inner = (
            <div className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-glow">
              <span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-ink-100 dark:bg-ink-800 ${c.tint}`}><Icon size={20} /></span>
              <div className="min-w-0">
                <div className="text-xl font-bold text-ink-900 dark:text-white">{c.value}</div>
                <div className="truncate text-xs text-ink-500">{c.label}</div>
              </div>
            </div>
          );
          return c.href ? <Link key={c.label} href={c.href}>{inner}</Link> : <div key={c.label}>{inner}</div>;
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card space-y-1 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-500"><Wallet size={16} /> Tổng doanh thu (đã thanh toán)</div>
          <div className="text-2xl font-bold text-emerald-600">{fmtVnd(s.revenue)}</div>
        </div>
        <div className="card space-y-1 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-500"><Coins size={16} /> Hoa hồng đã trả tác giả</div>
          <div className="text-2xl font-bold text-brand-600">{fmtVnd(s.commission)}</div>
        </div>
      </div>
    </div>
  );
}
