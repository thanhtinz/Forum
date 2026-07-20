import { db } from './db';
import { grantPoints } from './points';
import { grantBalance } from './balance';
import { notify } from './notify';

export type PurchaseOutcome =
  | { ok: true; already?: boolean }
  | { ok: false; error: 'NOT_PURCHASABLE' | 'INSUFFICIENT_POINTS' | 'INSUFFICIENT_BALANCE' | 'NOT_FOUND' };

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
export async function purchaseContent(userId: string, postId: string): Promise<PurchaseOutcome> {
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
      const price = (isPoints ? post.pricePoints : post.priceAmount) ?? 0;
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
            amount: 0, finalAmount: 0, pointsUsed: price, payMethod: 'POINTS', paidAt: new Date(),
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
            amount: price, finalAmount: price, payMethod: 'BALANCE', paidAt: new Date(),
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

      return { ok: true } as const;
    });
  } catch {
    return { ok: false, error: 'NOT_FOUND' };
  }
}
