import type { AccessLevel } from '@prisma/client';
import { db } from './db';

export interface AccessUser {
  id: string;
  vipTier: number | null;
  vipExpiresAt: Date | null;
  vipPermanent: boolean;
}

export interface AccessPost {
  id: string;
  access: AccessLevel;
  pricePoints: number | null;
  priceAmount: number | null;
  vipTierFree: number | null;
}

export type AccessReason =
  | 'FREE'
  | 'OWNER'
  | 'PURCHASED'
  | 'VIP_FREE'
  | 'VIP_TIER'
  | 'NEED_LOGIN'
  | 'NEED_POINTS'
  | 'NEED_PAYMENT'
  | 'NEED_VIP';

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
  /** Giá cần trả để mở khoá (nếu chưa được phép) */
  price?: { points?: number; amount?: number };
}

/** VIP còn hiệu lực? (vĩnh viễn, hoặc chưa hết hạn) */
export function isVipActive(user: Pick<AccessUser, 'vipTier' | 'vipExpiresAt' | 'vipPermanent'>): boolean {
  if (user.vipTier == null) return false;
  if (user.vipPermanent) return true;
  if (!user.vipExpiresAt) return true; // vipTier != null + không hạn => vĩnh viễn
  return user.vipExpiresAt.getTime() > Date.now();
}

/**
 * Quyết định người dùng có được xem nội dung ẩn của bài viết hay không.
 * KHÔNG bao giờ trả nội dung ẩn — chỉ trả kết quả; tầng server component
 * dựa vào đây để lọc `hiddenContent` trước khi render.
 *
 * `isAuthor` do caller truyền (so post.authorId === user.id) để tránh query thừa.
 */
export async function canAccess(
  user: AccessUser | null,
  post: AccessPost,
  opts: { isAuthor?: boolean; vipFreeContent?: boolean } = {},
): Promise<AccessResult> {
  // FREE — luôn mở
  if (post.access === 'FREE') return { allowed: true, reason: 'FREE' };

  // Tác giả luôn xem được bài của mình
  if (user && opts.isAuthor) return { allowed: true, reason: 'OWNER' };

  // Cần đăng nhập cho mọi mức còn lại
  if (!user) {
    return {
      allowed: false,
      reason: post.access === 'LOGIN_REQUIRED' ? 'NEED_LOGIN' : 'NEED_LOGIN',
      price: priceOf(post),
    };
  }

  // VIP có quyền "xem mọi nội dung miễn phí" — bỏ qua paywall (trừ VIP_ONLY vẫn xét tier)
  const vipActive = isVipActive(user);
  if (opts.vipFreeContent && vipActive && post.access !== 'VIP_ONLY') {
    return { allowed: true, reason: 'VIP_FREE' };
  }

  switch (post.access) {
    case 'LOGIN_REQUIRED':
      return { allowed: true, reason: 'FREE' };

    case 'VIP_ONLY': {
      const need = post.vipTierFree ?? 1;
      if (vipActive && (user.vipTier ?? 0) >= need) {
        return { allowed: true, reason: 'VIP_TIER' };
      }
      return { allowed: false, reason: 'NEED_VIP' };
    }

    case 'POINTS':
    case 'PAID': {
      const paid = await hasPaidOrder(user.id, post.id);
      if (paid) return { allowed: true, reason: 'PURCHASED' };
      return {
        allowed: false,
        reason: post.access === 'POINTS' ? 'NEED_POINTS' : 'NEED_PAYMENT',
        price: priceOf(post),
      };
    }

    default:
      return { allowed: false, reason: 'NEED_PAYMENT', price: priceOf(post) };
  }
}

function priceOf(post: AccessPost): AccessResult['price'] {
  const price: AccessResult['price'] = {};
  if (post.pricePoints != null) price.points = post.pricePoints;
  if (post.priceAmount != null) price.amount = post.priceAmount;
  return price;
}

async function hasPaidOrder(userId: string, postId: string): Promise<boolean> {
  const order = await db.order.findFirst({
    where: { userId, postId, type: 'CONTENT', status: 'PAID' },
    select: { id: true },
  });
  return !!order;
}
