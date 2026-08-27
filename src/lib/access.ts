import type { AccessLevel } from '@prisma/client';
import { db } from './db';

export interface AccessUser {
  id: string;
}

export interface AccessPost {
  id: string;
  access: AccessLevel;
  pricePoints: number | null;
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
  | 'NEED_LOGIN'
  | 'NEED_POINTS'
  | 'NEED_LIKE'
  | 'NEED_COMMENT'
  | 'NEED_LIKE_COMMENT'
  | 'NEED_LIKE_GOAL'
  | 'NEED_COMMENT_GOAL';

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
  /** Số điểm cần trả để mở khoá (nếu chưa được phép) */
  price?: { points?: number };
  /** Tiến độ với hai mức mở theo mốc chung (LIKE_GOAL / COMMENT_GOAL) */
  goal?: { current: number; target: number };
  /** Người xem đã thích / đã bình luận chưa (các mức theo từng người) */
  did?: { liked: boolean; commented: boolean };
}

/** Các mức mở khoá bằng tương tác (không thu tiền). */
export const INTERACTION_ACCESS: AccessLevel[] = ['LIKE', 'COMMENT', 'LIKE_COMMENT', 'LIKE_GOAL', 'COMMENT_GOAL'];

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
  opts: { isAuthor?: boolean } = {},
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

  switch (post.access) {
    case 'LOGIN_REQUIRED':
      return { allowed: true, reason: 'FREE' };

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

    case 'POINTS': {
      const paid = await hasPaidOrder(user.id, post.id);
      if (paid) return { allowed: true, reason: 'PURCHASED' };
      return { allowed: false, reason: 'NEED_POINTS', price: priceOf(post) };
    }

    default:
      return { allowed: false, reason: 'NEED_POINTS', price: priceOf(post) };
  }
}

function priceOf(post: AccessPost): AccessResult['price'] {
  const price: AccessResult['price'] = {};
  if (post.pricePoints != null) price.points = post.pricePoints;
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
    where: { userId, postId, status: 'PAID' },
    select: { id: true },
  });
  return !!order;
}
