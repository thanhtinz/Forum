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
  /** Mốc lượt thích cần đạt (LIKE_GOAL) */
  unlockLikes?: number | null;
  /** Mốc bình luận cần đạt (COMMENT_GOAL) */
  unlockComments?: number | null;
  /** Số liệu hiện tại — dùng cho hai mức theo mốc chung */
  likeCount?: number;
  commentCount?: number;
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
  | 'NEED_VIP'
  | 'NEED_LIKE'
  | 'NEED_COMMENT'
  | 'NEED_LIKE_COMMENT'
  | 'NEED_LIKE_GOAL'
  | 'NEED_COMMENT_GOAL';

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
  /** Giá cần trả để mở khoá (nếu chưa được phép) */
  price?: { points?: number; amount?: number };
  /** Tiến độ với hai mức mở theo mốc chung (LIKE_GOAL / COMMENT_GOAL) */
  goal?: { current: number; target: number };
  /** Người xem đã thích / đã bình luận chưa (các mức theo từng người) */
  did?: { liked: boolean; commented: boolean };
}

/** Các mức mở khoá bằng tương tác (không thu tiền). */
export const INTERACTION_ACCESS: AccessLevel[] = ['LIKE', 'COMMENT', 'LIKE_COMMENT', 'LIKE_GOAL', 'COMMENT_GOAL'];

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

  // Mốc chung: đạt đủ là mở cho TẤT CẢ, kể cả khách chưa đăng nhập
  if (post.access === 'LIKE_GOAL' || post.access === 'COMMENT_GOAL') {
    const isLike = post.access === 'LIKE_GOAL';
    const current = (isLike ? post.likeCount : post.commentCount) ?? 0;
    const target = (isLike ? post.unlockLikes : post.unlockComments) ?? 0;
    if (target <= 0 || current >= target) return { allowed: true, reason: 'FREE' };
    return {
      allowed: false,
      reason: isLike ? 'NEED_LIKE_GOAL' : 'NEED_COMMENT_GOAL',
      goal: { current, target },
    };
  }

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
  const isInteraction = INTERACTION_ACCESS.includes(post.access);
  if (opts.vipFreeContent && vipActive && post.access !== 'VIP_ONLY' && !isInteraction) {
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

    case 'LIKE':
    case 'COMMENT':
    case 'LIKE_COMMENT': {
      const need = post.access;
      const [liked, commented] = await Promise.all([
        need === 'COMMENT' ? Promise.resolve(false) : hasLiked(user.id, post.id),
        need === 'LIKE' ? Promise.resolve(false) : hasCommented(user.id, post.id),
      ]);
      const ok =
        need === 'LIKE' ? liked :
        need === 'COMMENT' ? commented :
        liked && commented;
      if (ok) return { allowed: true, reason: 'FREE', did: { liked, commented } };
      return {
        allowed: false,
        reason: need === 'LIKE' ? 'NEED_LIKE' : need === 'COMMENT' ? 'NEED_COMMENT' : 'NEED_LIKE_COMMENT',
        did: { liked, commented },
      };
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

/** Người xem đã thích bài chưa? */
async function hasLiked(userId: string, postId: string): Promise<boolean> {
  const r = await db.reaction.findFirst({ where: { userId, postId, type: 'LIKE' }, select: { id: true } });
  return !!r;
}

/** Người xem đã bình luận (còn hiển thị) chưa? */
async function hasCommented(userId: string, postId: string): Promise<boolean> {
  const c = await db.comment.findFirst({ where: { authorId: userId, postId }, select: { id: true } });
  return !!c;
}

async function hasPaidOrder(userId: string, postId: string): Promise<boolean> {
  const order = await db.order.findFirst({
    where: { userId, postId, type: 'CONTENT', status: 'PAID' },
    select: { id: true },
  });
  return !!order;
}
