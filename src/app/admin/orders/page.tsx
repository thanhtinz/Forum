import type { Metadata } from 'next';
import Link from 'next/link';
import { format } from 'date-fns';
import { Wallet, Crown, FileText, Coins } from 'lucide-react';
import { db } from '@/lib/db';
import { cn, fmtCount, fmtVnd } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { OrderRowActions } from '@/components/admin/OrderRowActions';

export const metadata: Metadata = { title: 'Đơn hàng' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;

const STATUSES = [
  { key: 'ALL', label: 'Tất cả' },
  { key: 'PENDING', label: 'Chờ thanh toán' },
  { key: 'PAID', label: 'Đã thanh toán' },
  { key: 'CANCELLED', label: 'Đã huỷ' },
  { key: 'REFUNDED', label: 'Đã hoàn' },
  { key: 'FAILED', label: 'Thất bại' },
] as const;

const TYPES = [
  { key: 'CONTENT', label: 'Mua nội dung', icon: FileText },
  { key: 'VIP', label: 'Mua VIP', icon: Crown },
  { key: 'TOPUP', label: 'Nạp tiền', icon: Wallet },
  { key: 'POINTS', label: 'Mua điểm', icon: Coins },
] as const;

const STATUS_BADGE: Record<string, string> = {
  PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  CANCELLED: 'bg-ink-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
  REFUNDED: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  FAILED: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};
const PAY_LABEL: Record<string, string> = { SEPAY: 'Chuyển khoản', BALANCE: 'Số dư', POINTS: 'Điểm', ADMIN: 'Admin xác nhận' };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string; status?: string; type?: string; q?: string }> }) {
  const { page: pageRaw, status: statusRaw, type: typeRaw, q: qRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const status = STATUSES.some((s) => s.key === statusRaw) ? statusRaw! : 'ALL';
  const type = TYPES.some((t) => t.key === typeRaw) ? typeRaw! : '';
  const q = (qRaw ?? '').trim();

  const where = {
    ...(status === 'ALL' ? {} : { status: status as never }),
    ...(type ? { type: type as never } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: 'insensitive' as const } },
            { user: { username: { contains: q, mode: 'insensitive' as const } } },
            { user: { email: { contains: q, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };

  const [total, orders, paidAgg, pendingCount] = await Promise.all([
    db.order.count({ where }),
    db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, code: true, type: true, status: true, amount: true, discount: true,
        finalAmount: true, pointsUsed: true, payMethod: true, paidAt: true, createdAt: true,
        user: { select: { name: true, username: true } },
        post: { select: { title: true, slug: true } },
        vipPlan: { select: { name: true } },
      },
    }),
    // Doanh thu tính trên toàn bộ đơn đã thanh toán, không phụ thuộc bộ lọc đang xem.
    db.order.aggregate({ where: { status: 'PAID' }, _sum: { finalAmount: true }, _count: true }),
    db.order.count({ where: { status: 'PENDING' } }),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Giữ nguyên bộ lọc khi chuyển trang.
  const qs = new URLSearchParams();
  if (status !== 'ALL') qs.set('status', status);
  if (type) qs.set('type', type);
  if (q) qs.set('q', q);
  const basePath = qs.toString() ? `/admin/orders?${qs}` : '/admin/orders';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Đơn hàng</h1>
        <p className="text-sm text-ink-500">
          {STATUSES.find((s) => s.key === status)?.label} · {fmtCount(total)} đơn
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Doanh thu đã thu</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{fmtVnd(paidAgg._sum.finalAmount ?? 0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Đơn đã thanh toán</p>
          <p className="mt-1 text-2xl font-bold text-ink-900 dark:text-white">{fmtCount(paidAgg._count)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">Đang chờ thanh toán</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{fmtCount(pendingCount)}</p>
        </div>
      </div>

      {/* Lọc — dùng ô chọn và ô tìm, không làm hàng tab */}
      <form method="get" className="card flex flex-wrap items-end gap-2 p-3">
        {status !== 'ALL' && <input type="hidden" name="status" value={status} />}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink-600 dark:text-ink-300">Loại đơn</span>
          <select name="type" defaultValue={type} className="input !w-auto min-w-44">
            <option value="">Mọi loại</option>
            {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>
        <label className="block min-w-52 flex-1">
          <span className="mb-1 block text-sm font-medium text-ink-600 dark:text-ink-300">Tìm kiếm</span>
          <input name="q" defaultValue={q} className="input" placeholder="Mã đơn, tên đăng nhập hoặc email" />
        </label>
        <button type="submit" className="btn-primary !px-3.5 !py-2 text-sm">Lọc</button>
        {(type || q) && (
          <Link href={status === 'ALL' ? '/admin/orders' : `/admin/orders?status=${status}`}
            className="px-1 pb-2 text-sm text-ink-500 hover:text-brand-600">Bỏ lọc</Link>
        )}
      </form>

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {orders.length === 0 && <div className="p-8 text-center text-sm text-ink-500">Không có đơn nào.</div>}
        {orders.map((o) => {
          const meta = TYPES.find((t) => t.key === o.type);
          const Icon = meta?.icon ?? FileText;
          const target = o.post?.title ?? o.vipPlan?.name ?? (o.type === 'TOPUP' ? 'Nạp số dư' : o.type === 'POINTS' ? 'Mua điểm' : '—');
          return (
            <div key={o.id} className="p-3 sm:flex sm:items-center sm:gap-3">
              <div className="min-w-0 sm:flex-1">
                <div className="flex items-start gap-1.5">
                  <Icon size={14} className="mt-0.5 shrink-0 text-ink-400" />
                  <span className="font-mono text-sm font-semibold text-ink-900 dark:text-white">{o.code}</span>
                  <span className="text-sm text-ink-500">·</span>
                  {o.post ? (
                    <Link href={`/posts/${o.post.slug}`} target="_blank" className="line-clamp-1 text-sm text-ink-700 hover:text-brand-600 dark:text-ink-200">{target}</Link>
                  ) : (
                    <span className="line-clamp-1 text-sm text-ink-700 dark:text-ink-200">{target}</span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-ink-500">
                  <span>{meta?.label ?? o.type}</span>
                  <span>·</span>
                  <span>{o.user?.name ?? o.user?.username ?? 'Ẩn danh'}</span>
                  <span>·</span>
                  <span>{format(o.paidAt ?? o.createdAt, 'dd/MM/yyyy HH:mm')}</span>
                  {o.payMethod && (<><span>·</span><span>{PAY_LABEL[o.payMethod] ?? o.payMethod}</span></>)}
                  {o.discount > 0 && (<><span>·</span><span className="text-emerald-600">giảm {fmtVnd(o.discount)}</span></>)}
                  {o.pointsUsed > 0 && (<><span>·</span><span>{fmtCount(o.pointsUsed)} điểm</span></>)}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 sm:mt-0 sm:shrink-0">
                <span className="text-sm font-semibold text-ink-900 dark:text-white">
                  {o.type === 'CONTENT' && o.payMethod === 'POINTS' ? `${fmtCount(o.pointsUsed)} điểm` : fmtVnd(o.finalAmount)}
                </span>
                <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-medium', STATUS_BADGE[o.status] ?? STATUS_BADGE.CANCELLED)}>
                  {STATUSES.find((s) => s.key === o.status)?.label ?? o.status}
                </span>
                <div className="ml-auto sm:ml-0">
                  <OrderRowActions id={o.id} code={o.code} status={o.status}
                    isTopup={o.type === 'TOPUP'} amountLabel={fmtVnd(o.finalAmount || o.amount)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={basePath} />}
    </div>
  );
}
