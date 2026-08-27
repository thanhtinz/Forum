import type { Coupon, Prisma } from '@prisma/client';
import { db } from './db';

export interface CouponCheck {
  coupon: Coupon;
  discount: number;
  finalAmount: number;
}

export type CouponError =
  | 'NOT_FOUND' | 'INACTIVE' | 'NOT_STARTED' | 'EXPIRED'
  | 'WRONG_TYPE' | 'MIN_AMOUNT' | 'OUT_OF_STOCK' | 'USER_LIMIT';

export const COUPON_ERROR_MESSAGE: Record<CouponError, string> = {
  NOT_FOUND: 'Mã giảm giá không tồn tại.',
  INACTIVE: 'Mã giảm giá đã ngừng áp dụng.',
  NOT_STARTED: 'Mã giảm giá chưa tới ngày áp dụng.',
  EXPIRED: 'Mã giảm giá đã hết hạn.',
  WRONG_TYPE: 'Mã giảm giá không dùng được cho đơn hàng này.',
  MIN_AMOUNT: 'Đơn hàng chưa đạt giá trị tối thiểu của mã.',
  OUT_OF_STOCK: 'Mã giảm giá đã hết lượt sử dụng.',
  USER_LIMIT: 'Bạn đã dùng hết số lượt cho mã này.',
};

/** Số tiền được giảm theo loại mã, đã chặn trần và không vượt quá giá trị đơn. */
export function discountFor(coupon: Pick<Coupon, 'type' | 'value' | 'maxDiscount'>, amount: number): number {
  const raw = coupon.type === 'PERCENT' ? Math.floor((amount * coupon.value) / 100) : coupon.value;
  const capped = coupon.maxDiscount != null ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.max(0, Math.min(capped, amount));
}

/**
 * Kiểm tra mã cho một đơn cụ thể. Dùng được cả khi xem trước (client bấm "Áp dụng")
 * lẫn ngay trước khi trừ tiền — truyền `tx` để chạy trong cùng transaction.
 */
export async function validateCoupon(
  input: { code: string; userId: string; amount: number },
  tx: Prisma.TransactionClient | typeof db = db,
): Promise<{ ok: true; result: CouponCheck } | { ok: false; error: CouponError }> {
  const code = input.code.trim().toUpperCase();
  const coupon = await tx.coupon.findUnique({ where: { code } });
  if (!coupon) return { ok: false, error: 'NOT_FOUND' };
  if (!coupon.active) return { ok: false, error: 'INACTIVE' };

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, error: 'NOT_STARTED' };
  if (coupon.endsAt && coupon.endsAt < now) return { ok: false, error: 'EXPIRED' };
  if (coupon.minAmount != null && input.amount < coupon.minAmount) return { ok: false, error: 'MIN_AMOUNT' };
  if (coupon.totalQuantity != null && coupon.usedCount >= coupon.totalQuantity) return { ok: false, error: 'OUT_OF_STOCK' };

  const used = await tx.couponClaim.count({ where: { couponId: coupon.id, userId: input.userId } });
  if (used >= coupon.perUserLimit) return { ok: false, error: 'USER_LIMIT' };

  const discount = discountFor(coupon, input.amount);
  return { ok: true, result: { coupon, discount, finalAmount: input.amount - discount } };
}

/**
 * Ghi nhận một lượt dùng mã. Tăng `usedCount` có điều kiện để hai đơn đồng thời
 * không thể vượt quá tổng số lượt phát hành.
 */
export async function redeemCoupon(
  input: { couponId: string; userId: string; totalQuantity: number | null },
  tx: Prisma.TransactionClient,
): Promise<string> {
  const bumped = await tx.coupon.updateMany({
    where: input.totalQuantity == null
      ? { id: input.couponId }
      : { id: input.couponId, usedCount: { lt: input.totalQuantity } },
    data: { usedCount: { increment: 1 } },
  });
  if (bumped.count === 0) throw new Error('COUPON_OUT_OF_STOCK');

  const claim = await tx.couponClaim.create({
    data: { couponId: input.couponId, userId: input.userId, usedAt: new Date() },
    select: { id: true },
  });
  return claim.id;
}
