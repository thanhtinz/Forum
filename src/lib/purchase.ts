import { db } from './db';
import { grantPoints } from './points';
import { grantBalance } from './balance';
import { notify } from './notify';
import { validateCoupon, redeemCoupon, type CouponError } from './coupon';

export type PurchaseOutcome =
  | { ok: true; already?: boolean; discount?: number }
  | { ok: false; error: 'NOT_PURCHASABLE' | 'INSUFFICIENT_POINTS' | 'INSUFFICIENT_BALANCE' | 'NOT_FOUND' }
  | { ok: false; error: 'COUPON'; couponError: CouponError };

/** Sinh mã đơn hiển thị (không cần chống va chạm mạnh — cột code là unique, retry hiếm). */
function newOrderCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.floor(Math.random() * 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `ORD-${ts}-${rnd}`;
}

/**
 * Hoa hồng nền tảng giữ lại (%). Tác giả nhận (100 - x)% doanh thu mỗi lượt bán.
 * TODO: cho admin cấu hình qua SiteSetting.
 */
export const PLATFORM_COMMISSION_PERCENT = 30;

/** Phần chia cho tác giả từ một khoản doanh thu. */
export function authorShareOf(amount: number): number {
  return Math.floor((amount * (100 - PLATFORM_COMMISSION_PERCENT)) / 100);
}

/**
 * Mua/mở khoá nội dung trả phí. Phương thức thanh toán suy ra từ `post.access`:
 *  - POINTS → trừ `pricePoints` (điểm)
 *  - PAID   → trừ `priceAmount` (số dư VND)
 *
 * Toàn bộ chạy trong MỘT transaction: kiểm tra quyền + đơn cũ, trừ tiền, tạo Order PAID.
 * Idempotent ở mức thực dụng: nếu đã có đơn PAID cho (user, post) thì trả `already` mà
 * không trừ thêm.
 */
export async function purchaseContent(userId: string, postId: string, couponCode?: string): Promise<PurchaseOutcome> {
  try {
    return await db.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { id: true, title: true, slug: true, authorId: true, access: true, pricePoints: true, priceAmount: true },
      });
      if (!post) return { ok: false, error: 'NOT_FOUND' } as const;

      // Chỉ POINTS / PAID mới mua được ở đây.
      if (post.access !== 'POINTS' && post.access !== 'PAID') {
        return { ok: false, error: 'NOT_PURCHASABLE' } as const;
      }

      // Đã sở hữu? → idempotent.
      const existing = await tx.order.findFirst({
        where: { userId, postId, type: 'CONTENT', status: 'PAID' },
        select: { id: true },
      });
      if (existing) return { ok: true, already: true } as const;

      const isPoints = post.access === 'POINTS';
      const listPrice = (isPoints ? post.pricePoints : post.priceAmount) ?? 0;

      // Mã giảm giá (không bắt buộc) — kiểm tra ngay trong transaction để tránh đua tranh.
      let discount = 0;
      let couponClaimId: string | null = null;
      if (couponCode?.trim()) {
        const check = await validateCoupon({ code: couponCode, userId, orderType: 'CONTENT', amount: listPrice }, tx);
        if (!check.ok) return { ok: false, error: 'COUPON', couponError: check.error } as const;
        discount = check.result.discount;
        couponClaimId = await redeemCoupon(
          { couponId: check.result.coupon.id, userId, totalQuantity: check.result.coupon.totalQuantity },
          tx,
        );
      }

      const price = Math.max(0, listPrice - discount);
      // Tác giả ăn chia trên số tiền người mua thực trả.
      const share = authorShareOf(price);
      const creditAuthor = post.authorId !== userId && share > 0;

      if (isPoints) {
        try {
          await grantPoints(
            { userId, amount: -price, reason: 'PURCHASE_CONTENT', refId: post.id, note: `Mở khoá: ${post.title}` },
            tx,
          );
        } catch {
          return { ok: false, error: 'INSUFFICIENT_POINTS' } as const;
        }
        await tx.order.create({
          data: {
            code: newOrderCode(), userId, type: 'CONTENT', status: 'PAID', postId: post.id,
            amount: 0, discount, finalAmount: 0, pointsUsed: price, payMethod: 'POINTS', paidAt: new Date(),
            couponClaimId,
          },
        });
        // Ăn chia: tác giả nhận phần điểm còn lại
        if (creditAuthor) {
          await grantPoints(
            { userId: post.authorId, amount: share, reason: 'CONTENT_SALE', refId: post.id, note: `Bán nội dung: ${post.title}` },
            tx,
          );
        }
      } else {
        try {
          await grantBalance(
            { userId, amount: -price, reason: 'PURCHASE', refId: post.id, note: `Mở khoá: ${post.title}` },
            tx,
          );
        } catch {
          return { ok: false, error: 'INSUFFICIENT_BALANCE' } as const;
        }
        await tx.order.create({
          data: {
            code: newOrderCode(), userId, type: 'CONTENT', status: 'PAID', postId: post.id,
            amount: listPrice, discount, finalAmount: price, payMethod: 'BALANCE', paidAt: new Date(),
            couponClaimId,
          },
        });
        // Ăn chia: tác giả nhận phần số dư (VND) còn lại
        if (creditAuthor) {
          await grantBalance(
            { userId: post.authorId, amount: share, reason: 'CONTENT_SALE', refId: post.id, note: `Bán nội dung: ${post.title}` },
            tx,
          );
        }
      }

      // Thông báo cho tác giả (kèm phần được chia).
      if (post.authorId !== userId) {
        const earn = isPoints ? `${share} điểm` : `${share.toLocaleString('vi-VN')}₫`;
        await notify(
          {
            userId: post.authorId, type: 'ORDER', title: `Có người mua nội dung — bạn nhận ${earn}`,
            content: post.title, link: `/posts/${post.slug}`, actorId: userId,
          },
          tx,
        );
      }

      return { ok: true, discount } as const;
    });
  } catch (e) {
    // redeemCoupon ném lỗi khi mã vừa hết lượt (đua tranh giữa hai đơn).
    if (e instanceof Error && e.message === 'COUPON_OUT_OF_STOCK') {
      return { ok: false, error: 'COUPON', couponError: 'OUT_OF_STOCK' };
    }
    return { ok: false, error: 'NOT_FOUND' };
  }
}
