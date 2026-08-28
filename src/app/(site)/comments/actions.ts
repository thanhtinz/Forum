'use server';

import type { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { notify } from '@/lib/notify';
import { resolveMentions, notifyMentions } from '@/lib/mention-notify';
import { getActiveBan, banMessage } from '@/lib/ban';
import { isBlockedBetween, BLOCK_MESSAGE } from '@/lib/block';

/**
 * Hành động cho khối bình luận và cho nút theo dõi người dùng.
 *
 * Trước đây nằm trong `posts/[slug]/actions.ts`. Mục bài viết đã gỡ khỏi trang,
 * nhưng khối bình luận thì vẫn dùng cho GAME, và nút theo dõi thì dùng ở trang
 * cá nhân — nên chuyển sang đây thay vì xoá theo.
 */

export interface ToggleState {
  active: boolean;
  count: number;
  error?: string;
}

/**
 * Bật/tắt thích cho một bình luận dưới game.
 *
 * Cột `likeCount` và `Reaction.commentId` đã có sẵn trong lược đồ từ lâu nhưng
 * chưa nơi nào dùng — bình luận là chỗ duy nhất trên trang không thả tim được,
 * trong khi chủ đề, trả lời và bảng tin câu lạc bộ đều thả được.
 */
export async function toggleCommentLike(commentId: string): Promise<ToggleState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { active: false, count: 0, error: 'Bạn cần đăng nhập.' };

  const c = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, hidden: true, game: { select: { slug: true } } },
  });
  if (!c) return { active: false, count: 0, error: 'Không tìm thấy bình luận.' };
  if (c.hidden) return { active: false, count: 0, error: 'Bình luận này đang bị ẩn.' };

  const existing = await db.reaction.findFirst({
    where: { userId, commentId, type: 'LIKE' }, select: { id: true },
  });
  const after = await db.$transaction(async (tx) => {
    if (existing) {
      await tx.reaction.delete({ where: { id: existing.id } });
      return tx.comment.update({
        where: { id: commentId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true },
      });
    }
    await tx.reaction.create({ data: { userId, commentId, type: 'LIKE' } });
    return tx.comment.update({
      where: { id: commentId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true },
    });
  });

  if (c.game?.slug) revalidatePath(`/games/${c.game.slug}`);
  return { active: !existing, count: Math.max(0, after.likeCount) };
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

  const gameId = String(formData.get('gameId') ?? '') || null;
  const slug = String(formData.get('slug') ?? '');
  const parentId = String(formData.get('parentId') ?? '') || null;
  const content = String(formData.get('content') ?? '').trim();

  if (!gameId) return { error: 'Thiếu thông tin game.' };
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
      where: { id: parentId }, select: { id: true, gameId: true, parentId: true, authorId: true },
    });
    const sameTarget = parent?.gameId === gameId;
    if (!parent || !sameTarget) return { error: 'Phản hồi không hợp lệ.' };
    rootId = parent.parentId ?? parent.id;
    parentAuthorId = parent.authorId;
  }

  // Game là hàng của nền tảng, không có tác giả để báo tin.
  const target = await db.game.findUnique({ where: { id: gameId }, select: { slug: true, title: true } });
  if (!target) return { error: 'Không tìm thấy game để bình luận.' };

  const ownerId: string | null = null;
  const link = `/games/${target.slug}`;
  const mentioned = await resolveMentions(content, userId, [ownerId, parentAuthorId]);

  await db.$transaction(async (tx) => {
    await tx.comment.create({
      data: { gameId, authorId: userId, content, parentId: rootId },
      select: { id: true },
    });
    await bumpCommentCount(tx, { gameId }, 1);

    if (ownerId && ownerId !== userId) {
      await notify(
        { userId: ownerId, type: 'COMMENT', title: 'Có bình luận mới', content: target.title, link, actorId: userId },
        tx,
      );
    }
    // Báo cho người được phản hồi — trừ khi họ đã được báo ở trên.
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
 * Bình luận chỉ còn gắn vào game. Vẫn giữ kiểu riêng thay vì dùng thẳng
 * `gameId`: hai hàm dưới đây nhận đúng thứ chúng cần, và nếu sau này có thêm
 * chỗ khác nhận bình luận thì chỉ phải sửa ở đây.
 */
type CommentTarget = { gameId: string | null; gameSlug?: string | null };

function targetPath(t: CommentTarget): string {
  return `/games/${t.gameSlug ?? ''}`;
}

/** Cộng/trừ bộ đếm bình luận của game. */
async function bumpCommentCount(tx: Prisma.TransactionClient, t: CommentTarget, by: number) {
  if (by === 0 || !t.gameId) return;
  await tx.game.update({ where: { id: t.gameId }, data: { commentCount: { increment: by } }, select: { id: true } });
}

// ─────────────────────────── Kiểm duyệt bình luận ───────────────────────────

export interface CommentModState {
  pinned?: boolean;
  hidden?: boolean;
  error?: string;
}

/** Bình luận dưới game không có "chủ bài" nào, nên chỉ ban quản trị quản được. */
async function canManageComment(userId: string, commentId: string) {
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true, pinned: true, hidden: true, gameId: true,
      game: { select: { slug: true } },
    },
  });
  if (!comment) return null;

  const me = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isStaff = me?.role === 'ADMIN' || me?.role === 'MODERATOR';
  return isStaff ? comment : null;
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
  revalidatePath(targetPath({ ...comment, gameSlug: comment.game?.slug }));
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

  revalidatePath(targetPath({ ...comment, gameSlug: comment.game?.slug }));
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
 * Quản trị viên cố tình không nằm trong diện này: họ đã có nút
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
      id: true, authorId: true, hidden: true, gameId: true,
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

  revalidatePath(targetPath({ ...guard.comment, gameSlug: guard.comment.game?.slug }));
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

  // Đếm bằng count thay vì kéo cả danh sách phản hồi về chỉ để đếm.
  const visibleChildren = await db.comment.count({ where: { parentId: commentId, hidden: false } });
  const visible = (comment.hidden ? 0 : 1) + visibleChildren;

  await db.$transaction(async (tx) => {
    await tx.comment.delete({ where: { id: commentId } });
    await bumpCommentCount(tx, comment, -visible);
  });

  revalidatePath(targetPath({ ...comment, gameSlug: comment.game?.slug }));
  return { ok: true };
}
