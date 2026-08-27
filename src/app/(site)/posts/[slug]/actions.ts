'use server';

import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { purchaseContent } from '@/lib/purchase';
import { COUPON_ERROR_MESSAGE } from '@/lib/coupon';
import { notify } from '@/lib/notify';
import { resolveMentions, notifyMentions } from '@/lib/mention-notify';
import { getActiveBan, banMessage } from '@/lib/ban';
import { isBlockedBetween, BLOCK_MESSAGE } from '@/lib/block';

export interface UnlockState {
  error?: string;
  ok?: boolean;
}

const MESSAGES: Record<string, string> = {
  NOT_FOUND: 'Không tìm thấy bài viết.',
  NOT_PURCHASABLE: 'Nội dung này không mở khoá bằng cách mua.',
  INSUFFICIENT_POINTS: 'Bạn không đủ điểm để mở khoá.',
  INSUFFICIENT_BALANCE: 'Số dư của bạn không đủ. Hãy nạp thêm.',
};

export async function unlockPost(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const postId = String(formData.get('postId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const coupon = String(formData.get('coupon') ?? '').trim();
  if (!postId) return { error: 'Thiếu thông tin bài viết.' };

  const res = await purchaseContent(userId, postId, coupon || undefined);
  if (!res.ok) {
    if (res.error === 'COUPON') return { error: COUPON_ERROR_MESSAGE[res.couponError] };
    return { error: MESSAGES[res.error] ?? 'Không thể mở khoá.' };
  }

  if (slug) revalidatePath(`/posts/${slug}`);
  return { ok: true };
}

// ─────────────────────────── Thích / Lưu ───────────────────────────

export interface ToggleState {
  active: boolean;
  count: number;
  error?: string;
}

/** Bật/tắt thích cho bài viết (Reaction LIKE), đồng bộ likeCount trong transaction. */
export async function toggleLike(postId: string): Promise<ToggleState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { active: false, count: 0, error: 'Bạn cần đăng nhập.' };

  const existing = await db.reaction.findFirst({ where: { userId, postId, type: 'LIKE' }, select: { id: true } });
  const post = await db.$transaction(async (tx) => {
    if (existing) {
      await tx.reaction.delete({ where: { id: existing.id } });
      return tx.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } });
    }
    await tx.reaction.create({ data: { userId, postId, type: 'LIKE' } });
    return tx.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } });
  });
  return { active: !existing, count: Math.max(0, post.likeCount) };
}

/** Bật/tắt lưu bài (Favorite). Trả về số lượt lưu hiện tại. */
export async function toggleFavorite(postId: string): Promise<ToggleState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { active: false, count: 0, error: 'Bạn cần đăng nhập.' };

  const existing = await db.favorite.findFirst({ where: { userId, postId }, select: { id: true } });
  if (existing) await db.favorite.delete({ where: { id: existing.id } });
  else await db.favorite.create({ data: { userId, postId } });

  const count = await db.favorite.count({ where: { postId } });
  return { active: !existing, count };
}

/** Theo dõi / bỏ theo dõi một người dùng. */
export async function toggleFollow(targetId: string): Promise<ToggleState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { active: false, count: 0, error: 'Bạn cần đăng nhập.' };
  if (userId === targetId) return { active: false, count: 0, error: 'Không thể tự theo dõi chính mình.' };
  if (await isBlockedBetween(userId, targetId)) return { active: false, count: 0, error: BLOCK_MESSAGE };

  const existing = await db.follow.findFirst({ where: { followerId: userId, followingId: targetId }, select: { id: true } });
  if (existing) await db.follow.delete({ where: { id: existing.id } });
  else await db.follow.create({ data: { followerId: userId, followingId: targetId } });

  const count = await db.follow.count({ where: { followingId: targetId } });
  return { active: !existing, count };
}

// ─────────────────────────── Bình luận ───────────────────────────

export interface CommentState {
  ok?: boolean;
  error?: string;
}

export async function addComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để bình luận.' };

  const postId = String(formData.get('postId') ?? '') || null;
  const gameId = String(formData.get('gameId') ?? '') || null;
  const slug = String(formData.get('slug') ?? '');
  const parentId = String(formData.get('parentId') ?? '') || null;
  const content = String(formData.get('content') ?? '').trim();

  if (!postId === !gameId) return { error: 'Thiếu thông tin bài viết.' };
  if (content.length < 2) return { error: 'Bình luận quá ngắn.' };
  if (content.length > 2000) return { error: 'Bình luận tối đa 2000 ký tự.' };

  const banned = await getActiveBan(userId, 'COMMENT');
  if (banned) return { error: banMessage(banned, 'bình luận') };

  const rate = await checkRateLimit('comment', userId);
  if (!rate.allowed) return { error: rate.message };

  // Phản hồi phải nằm cùng bài, và luôn gắn vào bình luận gốc của nhánh: gửi
  // thẳng biểu mẫu với parentId của một phản hồi cũng không lồng sâu thêm được.
  let rootId: string | null = null;
  let parentAuthorId: string | null = null;
  if (parentId) {
    const parent = await db.comment.findUnique({
      where: { id: parentId }, select: { id: true, postId: true, gameId: true, parentId: true, authorId: true },
    });
    const sameTarget = postId ? parent?.postId === postId : parent?.gameId === gameId;
    if (!parent || !sameTarget) return { error: 'Phản hồi không hợp lệ.' };
    rootId = parent.parentId ?? parent.id;
    parentAuthorId = parent.authorId;
  }

  // Game không có tác giả để báo tin; bài viết thì có.
  const target: { authorId: string | null; slug: string; title: string } | null = postId
    ? await db.post.findUnique({ where: { id: postId }, select: { authorId: true, slug: true, title: true } })
    : await db.game
        .findUnique({ where: { id: gameId! }, select: { slug: true, title: true } })
        .then((g) => (g ? { authorId: null, slug: g.slug, title: g.title } : null));
  if (!target) return { error: 'Không tìm thấy nội dung để bình luận.' };

  const ownerId = target.authorId;
  const link = postId ? `/posts/${target.slug}` : `/games/${target.slug}`;
  const mentioned = await resolveMentions(content, userId, [ownerId, parentAuthorId]);

  await db.$transaction(async (tx) => {
    await tx.comment.create({
      data: { postId, gameId, authorId: userId, content, parentId: rootId },
      select: { id: true },
    });
    await bumpCommentCount(tx, { postId, gameId }, 1);

    if (ownerId && ownerId !== userId) {
      await notify(
        { userId: ownerId, type: 'COMMENT', title: 'Có bình luận mới', content: target.title, link, actorId: userId },
        tx,
      );
    }
    // Báo cho người được phản hồi — trừ khi họ là chủ bài viết (đã báo ở trên).
    if (parentAuthorId && parentAuthorId !== userId && parentAuthorId !== ownerId) {
      await notify(
        { userId: parentAuthorId, type: 'COMMENT', title: 'Có người phản hồi bình luận của bạn', content: target.title, link, actorId: userId },
        tx,
      );
    }
    await notifyMentions(mentioned, {
      title: 'Có người nhắc tên bạn', content: target.title, link, actorId: userId,
    }, tx);
  });

  if (slug) revalidatePath(link);
  return { ok: true };
}

/**
 * Bình luận gắn vào bài viết hoặc game. Gom hai khác biệt duy nhất — đường dẫn
 * để làm mới, và bảng giữ bộ đếm — vào một chỗ, phần còn lại dùng chung.
 */
type CommentTarget = { postId: string | null; gameId: string | null; postSlug?: string | null; gameSlug?: string | null };

function targetPath(t: CommentTarget): string {
  return t.gameId ? `/games/${t.gameSlug ?? ''}` : `/posts/${t.postSlug ?? ''}`;
}

/** Cộng/trừ bộ đếm bình luận của đúng bảng đang giữ nó. */
async function bumpCommentCount(tx: Prisma.TransactionClient, t: CommentTarget, by: number) {
  if (by === 0) return;
  if (t.gameId) {
    await tx.game.update({ where: { id: t.gameId }, data: { commentCount: { increment: by } }, select: { id: true } });
  } else if (t.postId) {
    await tx.post.update({ where: { id: t.postId }, data: { commentCount: { increment: by } }, select: { id: true } });
  }
}

// ─────────────────────────── Kiểm duyệt bình luận ───────────────────────────

export interface CommentModState {
  pinned?: boolean;
  hidden?: boolean;
  error?: string;
}

/**
 * Chủ bài viết và quản trị viên được quản lý bình luận trong bài đó.
 * Bình luận dưới game thì không có "chủ bài" nào, chỉ ban quản trị.
 */
async function canManageComment(userId: string, commentId: string) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true, pinned: true, hidden: true, postId: true, gameId: true,
      post: { select: { authorId: true, slug: true } },
      game: { select: { slug: true } },
    },
  });
  if (!comment) return null;

  const me = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isStaff = me?.role === 'ADMIN' || me?.role === 'MODERATOR';
  const allowed = isStaff || comment.post?.authorId === userId;
  return allowed ? comment : null;
}

/** Ghim một bình luận lên đầu danh sách. */
export async function toggleCommentPinned(commentId: string): Promise<CommentModState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const comment = await canManageComment(userId, commentId);
  if (!comment) return { error: 'Bạn không có quyền quản lý bình luận này.' };

  const pinned = !comment.pinned;
  await db.comment.update({ where: { id: commentId }, data: { pinned }, select: { id: true } });
  revalidatePath(targetPath({ ...comment, postSlug: comment.post?.slug, gameSlug: comment.game?.slug }));
  return { pinned };
}

/**
 * Ẩn hoặc hiện lại một bình luận.
 *
 * Ẩn chứ không xoá để còn đối chiếu khi có khiếu nại. Số đếm bình luận của
 * bài phải chỉnh theo, không thì bài khoe nhiều bình luận hơn số đọc được.
 */
export async function toggleCommentHidden(commentId: string): Promise<CommentModState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const comment = await canManageComment(userId, commentId);
  if (!comment) return { error: 'Bạn không có quyền quản lý bình luận này.' };

  const hidden = !comment.hidden;
  await db.$transaction(async (tx) => {
    await tx.comment.update({
      where: { id: commentId },
      // Bình luận đã ẩn thì bỏ ghim luôn, ghim một thứ không ai thấy là vô nghĩa.
      data: { hidden, ...(hidden ? { pinned: false } : {}) },
      select: { id: true },
    });
    await bumpCommentCount(tx, comment, hidden ? -1 : 1);
  });

  revalidatePath(targetPath({ ...comment, postSlug: comment.post?.slug, gameSlug: comment.game?.slug }));
  return { hidden };
}

// ─────────────────── Sửa / xoá bình luận của chính mình ───────────────────

export interface CommentEditState {
  ok?: boolean;
  error?: string;
}

/**
 * Chỉ tác giả mới sửa/xoá được bình luận của mình.
 *
 * Chủ bài viết và quản trị viên cố tình không nằm trong diện này: họ đã có nút
 * "Ẩn", giữ nguyên nội dung để còn đối chiếu khi có khiếu nại — sửa lời người
 * khác hay xoá hẳn thì mất dấu vết.
 */
async function assertCommentOwner(commentId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' as const };

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true, authorId: true, hidden: true, postId: true, gameId: true,
      post: { select: { slug: true } },
      game: { select: { slug: true } },
    },
  });
  if (!comment) return { error: 'Không tìm thấy bình luận.' as const };
  if (comment.authorId !== userId) return { error: 'Bạn chỉ sửa được bình luận của mình.' as const };

  return { userId, comment };
}

/**
 * Sửa nội dung bình luận.
 *
 * Không gửi lại thông báo nhắc tên cho những @tên mới thêm vào: sửa bài để
 * chèn tên người khác là đường vòng để làm phiền, mà bản gốc đã báo một lần rồi.
 */
export async function updateComment(_prev: CommentEditState, formData: FormData): Promise<CommentEditState> {
  const commentId = String(formData.get('commentId') ?? '');
  const guard = await assertCommentOwner(commentId);
  if ('error' in guard) return { error: guard.error };

  const content = String(formData.get('content') ?? '').trim();
  if (content.length < 2) return { error: 'Bình luận quá ngắn.' };
  if (content.length > 2000) return { error: 'Bình luận tối đa 2000 ký tự.' };

  await db.comment.update({ where: { id: commentId }, data: { content }, select: { id: true } });

  revalidatePath(targetPath({ ...guard.comment, postSlug: guard.comment.post?.slug, gameSlug: guard.comment.game?.slug }));
  return { ok: true };
}

/**
 * Xoá hẳn bình luận của mình, kèm các phản hồi lồng bên dưới (khoá ngoại tự dọn).
 *
 * Bộ đếm chỉ trừ đi những bình luận đang thật sự hiện: bình luận đã bị ẩn thì
 * lúc ẩn đã trừ rồi, trừ thêm lần nữa là số đếm âm dần.
 */
export async function deleteOwnComment(commentId: string): Promise<CommentEditState> {
  const guard = await assertCommentOwner(commentId);
  if ('error' in guard) return { error: guard.error };
  const { comment } = guard;

  const children = await db.comment.findMany({
    where: { parentId: commentId }, select: { hidden: true },
  });
  const visible = (comment.hidden ? 0 : 1) + children.filter((c) => !c.hidden).length;

  await db.$transaction(async (tx) => {
    await tx.comment.delete({ where: { id: commentId } });
    await bumpCommentCount(tx, comment, -visible);
  });

  revalidatePath(targetPath({ ...comment, postSlug: comment.post?.slug, gameSlug: comment.game?.slug }));
  return { ok: true };
}
