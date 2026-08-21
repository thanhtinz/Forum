'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { grantBalance } from '@/lib/balance';
import { notify } from '@/lib/notify';
import { validateCoupon, redeemCoupon, COUPON_ERROR_MESSAGE } from '@/lib/coupon';
import { fmtVnd } from '@/lib/utils';

export interface BuyVipState {
  ok?: boolean;
  error?: string;
}

export interface CouponPreview {
  ok?: boolean;
  error?: string;
  code?: string;
  discount?: number;
  finalAmount?: number;
  label?: string;
}

function newOrderCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `ORD-${ts}-${rnd}`;
}

/** Xem trước mức giảm của một mã cho gói VIP đang chọn (chưa ghi nhận lượt dùng). */
export async function previewVipCoupon(planId: string, rawCode: string): Promise<CouponPreview> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const code = rawCode.trim().toUpperCase();
  if (!code) return { error: 'Nhập mã giảm giá.' };

  const plan = await db.vipPlan.findUnique({ where: { id: planId }, select: { price: true, active: true } });
  if (!plan || !plan.active) return { error: 'Gói VIP không tồn tại.' };

  const checked = await validateCoupon({ code, userId, orderType: 'VIP', amount: plan.price });
  if (!checked.ok) return { error: COUPON_ERROR_MESSAGE[checked.error] };

  const { coupon, discount, finalAmount } = checked.result;
  return {
    ok: true, code, discount, finalAmount,
    label: `${coupon.name} — giảm ${fmtVnd(discount)}`,
  };
}

/** Mua/gia hạn VIP bằng số dư, có thể kèm mã giảm giá. Atomic trong transaction. */
export async function buyVip(planId: string, rawCode?: string): Promise<BuyVipState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };
  const code = (rawCode ?? '').trim().toUpperCase();

  try {
    await db.$transaction(async (tx) => {
      const plan = await tx.vipPlan.findUnique({ where: { id: planId } });
      if (!plan || !plan.active) throw new Error('PLAN');

      const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { vipTier: true, vipExpiresAt: true, vipPermanent: true } });

      // Mã giảm giá: kiểm tra lại ngay trước khi trừ tiền
      let discount = 0;
      let couponClaimId: string | null = null;
      if (code) {
        const checked = await validateCoupon({ code, userId, orderType: 'VIP', amount: plan.price }, tx);
        if (!checked.ok) throw new Error(`COUPON:${checked.error}`);
        discount = checked.result.discount;
        couponClaimId = await redeemCoupon(
          { couponId: checked.result.coupon.id, userId, totalQuantity: checked.result.coupon.totalQuantity },
          tx,
        );
      }
      const finalAmount = plan.price - discount;

      // Trừ số dư (ném lỗi nếu không đủ)
      if (finalAmount > 0) {
        await grantBalance({ userId, amount: -finalAmount, reason: 'PURCHASE', note: `Mua ${plan.name}` }, tx);
      }

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
        data: {
          code: newOrderCode(), userId, type: 'VIP', status: 'PAID', vipPlanId: plan.id,
          amount: plan.price, discount, finalAmount, couponClaimId,
          payMethod: 'BALANCE', paidAt: now,
        },
      });
      await notify({
        userId, type: 'VIP', title: `Kích hoạt ${plan.name} thành công`,
        content: vipPermanent ? 'VIP vĩnh viễn' : `Hết hạn ${vipExpiresAt?.toLocaleDateString('vi-VN')}`,
        link: '/user/dashboard',
      }, tx);
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'PLAN') return { error: 'Gói VIP không tồn tại.' };
    if (msg === 'COUPON_OUT_OF_STOCK') return { error: COUPON_ERROR_MESSAGE.OUT_OF_STOCK };
    if (msg.startsWith('COUPON:')) {
      const key = msg.slice(7) as keyof typeof COUPON_ERROR_MESSAGE;
      return { error: COUPON_ERROR_MESSAGE[key] ?? 'Mã giảm giá không hợp lệ.' };
    }
    if (msg.includes('Số dư')) return { error: 'Số dư không đủ. Hãy nạp thêm.' };
    return { error: 'Không thể mua VIP.' };
  }

  revalidatePath('/vip');
  revalidatePath('/user/dashboard');
  return { ok: true };
}
