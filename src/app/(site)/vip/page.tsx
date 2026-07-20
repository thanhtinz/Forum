import type { Metadata } from 'next';
import { Crown, Check, Percent, Gift, Coins, CalendarCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { fmtVnd } from '@/lib/utils';
import { BuyVipButton } from '@/components/vip/BuyVipButton';

export const metadata: Metadata = { title: 'Nâng cấp VIP' };
export const dynamic = 'force-dynamic';

export default async function VipPage() {
  const [plans, session] = await Promise.all([
    db.vipPlan.findMany({ where: { active: true }, orderBy: { tier: 'asc' } }),
    auth(),
  ]);

  let current: { vipTier: number | null; vipExpiresAt: Date | null; vipPermanent: boolean } | null = null;
  if (session?.user?.id) {
    current = await db.user.findUnique({ where: { id: session.user.id }, select: { vipTier: true, vipExpiresAt: true, vipPermanent: true } });
  }
  const vipActive = !!current?.vipTier && (current.vipPermanent || !current.vipExpiresAt || current.vipExpiresAt > new Date());

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white"><Crown size={24} /></div>
        <h1 className="text-2xl font-black">Nâng cấp VIP</h1>
        <p className="mt-1 text-ink-500">Mở khoá đặc quyền: giảm giá, xem nội dung miễn phí, thưởng điểm mỗi ngày…</p>
        {vipActive && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-950/40">
            <Crown size={14} /> Bạn đang là VIP{current!.vipTier}
            {current!.vipPermanent ? ' (vĩnh viễn)' : current!.vipExpiresAt ? ` — hết hạn ${current!.vipExpiresAt.toLocaleDateString('vi-VN')}` : ''}
          </p>
        )}
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const isCurrent = vipActive && current!.vipTier === p.tier;
          const benefits: { icon: React.ReactNode; text: string }[] = [
            { icon: <CalendarCheck size={15} />, text: p.permanent || !p.durationDays ? 'Thời hạn vĩnh viễn' : `Thời hạn ${p.durationDays} ngày` },
          ];
          if (p.discountPercent > 0) benefits.push({ icon: <Percent size={15} />, text: `Giảm ${p.discountPercent}% khi mua nội dung` });
          if (p.freeContent) benefits.push({ icon: <Gift size={15} />, text: 'Xem miễn phí mọi nội dung trả phí' });
          if (p.dailyPointsBonus > 0) benefits.push({ icon: <Coins size={15} />, text: `+${p.dailyPointsBonus} điểm mỗi ngày` });
          if (p.checkinMultiplier > 1) benefits.push({ icon: <CalendarCheck size={15} />, text: `Điểm danh nhân ${p.checkinMultiplier}×` });

          return (
            <div key={p.id} className={`card relative flex flex-col p-6 ${p.tier === 2 ? 'ring-2 ring-amber-400' : ''}`}>
              {p.tier === 2 && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-white">Phổ biến</span>}
              <div className="flex items-center gap-2">
                <Crown size={18} style={{ color: p.color || '#f59e0b' }} />
                <h2 className="text-lg font-bold">{p.name}</h2>
              </div>
              {p.description && <p className="mt-1 text-sm text-ink-500">{p.description}</p>}
              <div className="mt-3 flex items-end gap-1.5">
                <span className="text-3xl font-black" style={{ color: p.color || '#f59e0b' }}>{fmtVnd(p.price)}</span>
                {p.originalPrice && p.originalPrice > p.price && <span className="mb-1 text-sm text-ink-400 line-through">{fmtVnd(p.originalPrice)}</span>}
              </div>

              <ul className="mt-4 flex-1 space-y-2 border-t border-ink-100 pt-4 text-sm dark:border-ink-800">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40">{b.icon}</span>
                    {b.text}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent && <p className="mb-2 flex items-center justify-center gap-1 text-xs font-semibold text-amber-600"><Check size={13} /> Gói hiện tại của bạn</p>}
                <BuyVipButton planId={p.id} loggedIn={!!session?.user} isCurrent={isCurrent} />
              </div>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && <div className="card p-12 text-center text-ink-400">Chưa có gói VIP nào.</div>}
    </div>
  );
}
