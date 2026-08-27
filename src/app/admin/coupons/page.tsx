import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { CouponManager, type CouponRow } from '@/components/admin/CouponManager';

export const metadata: Metadata = { title: 'Mã giảm giá' };
export const dynamic = 'force-dynamic';

export default async function AdminCouponsPage() {
  const coupons = await db.coupon.findMany({
    orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { claims: true } } },
  });

  const rows: CouponRow[] = coupons.map((c) => ({
    id: c.id, code: c.code, name: c.name, type: c.type, value: c.value,
    minAmount: c.minAmount, maxDiscount: c.maxDiscount,
    totalQuantity: c.totalQuantity, usedCount: c.usedCount, perUserLimit: c.perUserLimit,
    startsAt: c.startsAt?.toISOString() ?? null, endsAt: c.endsAt?.toISOString() ?? null,
    active: c.active, claimCount: c._count.claims,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Mã giảm giá</h1>
        <p className="text-sm text-ink-500">Tạo mã giảm theo số điểm hoặc phần trăm, giới hạn lượt dùng và thời gian áp dụng.</p>
      </div>
      <CouponManager coupons={rows} />
    </div>
  );
}
