import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { VipPlanEditor, type VipPlanRow } from '@/components/admin/VipPlanEditor';

export const metadata: Metadata = { title: 'Gói VIP' };
export const dynamic = 'force-dynamic';

export default async function AdminVipPlansPage() {
  const plans = await db.vipPlan.findMany({
    orderBy: [{ tier: 'asc' }],
    select: {
      id: true, tier: true, name: true, description: true, icon: true, color: true,
      price: true, originalPrice: true, durationDays: true, discountPercent: true, freeContent: true, active: true,
    },
  });
  const rows: VipPlanRow[] = plans;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Quản lý gói VIP</h1>
        <p className="text-sm text-ink-500">Điều chỉnh giá, thời hạn và quyền lợi từng bậc VIP.</p>
      </div>
      {rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-500">Chưa có gói VIP nào. Hãy chạy seed để tạo dữ liệu mẫu.</div>
      ) : (
        <div className="space-y-3">{rows.map((p) => <VipPlanEditor key={p.id} plan={p} />)}</div>
      )}
    </div>
  );
}
