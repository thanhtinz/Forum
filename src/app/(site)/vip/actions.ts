'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { grantBalance } from '@/lib/balance';
import { notify } from '@/lib/notify';

export interface BuyVipState {
  ok?: boolean;
  error?: string;
}

function newOrderCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `ORD-${ts}-${rnd}`;
}

/** Mua/gia hạn VIP bằng số dư. Atomic trong transaction. */
export async function buyVip(planId: string): Promise<BuyVipState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  try {
    await db.$transaction(async (tx) => {
      const plan = await tx.vipPlan.findUnique({ where: { id: planId } });
      if (!plan || !plan.active) throw new Error('PLAN');

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { vipTier: true, vipExpiresAt: true, vipPermanent: true } });

      // Trừ số dư (ném lỗi nếu không đủ)
      await grantBalance({ userId, amount: -plan.price, reason: 'PURCHASE', note: `Mua ${plan.name}` }, tx);

      const now = new Date();
      let vipExpiresAt: Date | null = null;
      let vipPermanent = false;
      if (plan.permanent || plan.durationDays == null) {
        vipPermanent = true;
      } else {
        // Gia hạn: cộng dồn nếu đang còn VIP cùng bậc
        const base = user.vipTier === plan.tier && user.vipExpiresAt && user.vipExpiresAt > now ? user.vipExpiresAt : now;
        vipExpiresAt = new Date(base.getTime() + plan.durationDays * 24 * 3600 * 1000);
      }

      await tx.user.update({ where: { id: userId }, data: { vipTier: plan.tier, vipExpiresAt, vipPermanent } });

      await tx.order.create({
        data: { code: newOrderCode(), userId, type: 'VIP', status: 'PAID', vipPlanId: plan.id, amount: plan.price, finalAmount: plan.price, payMethod: 'BALANCE', paidAt: now },
      });
      await notify({ userId, type: 'VIP', title: `Kích hoạt ${plan.name} thành công`, content: vipPermanent ? 'VIP vĩnh viễn' : `Hết hạn ${vipExpiresAt?.toLocaleDateString('vi-VN')}`, link: '/user/dashboard' }, tx);
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'PLAN') return { error: 'Gói VIP không tồn tại.' };
    if (msg.includes('Số dư')) return { error: 'Số dư không đủ. Hãy nạp thêm.' };
    return { error: 'Không thể mua VIP.' };
  }

  revalidatePath('/vip');
  revalidatePath('/user/dashboard');
  return { ok: true };
}
