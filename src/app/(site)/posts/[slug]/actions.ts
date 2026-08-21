'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { purchaseContent } from '@/lib/purchase';
import { notify } from '@/lib/notify';

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
  if (!postId) return { error: 'Thiếu thông tin bài viết.' };

  const res = await purchaseContent(userId, postId);
  if (!res.ok) return { error: MESSAGES[res.error] ?? 'Không thể mở khoá.' };

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

  const postId = String(formData.get('postId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const parentId = String(formData.get('parentId') ?? '') || null;
  const content = String(formData.get('content') ?? '').trim();

  if (!postId) return { error: 'Thiếu thông tin bài viết.' };
  if (content.length < 2) return { error: 'Bình luận quá ngắn.' };
  if (content.length > 2000) return { error: 'Bình luận tối đa 2000 ký tự.' };

  const rate = await checkRateLimit('comment', userId);
  if (!rate.allowed) return { error: rate.message };

  await db.$transaction(async (tx) => {
    await tx.comment.create({ data: { postId, authorId: userId, content, parentId } });
    const post = await tx.post.update({
      where: { id: postId }, data: { commentCount: { increment: 1 } },
      select: { authorId: true, slug: true, title: true },
    });
    if (post.authorId !== userId) {
      await notify(
        { userId: post.authorId, type: 'COMMENT', title: 'Có bình luận mới', content: post.title, link: `/posts/${post.slug}`, actorId: userId },
        tx,
      );
    }
  });

  if (slug) revalidatePath(`/posts/${slug}`);
  return { ok: true };
}
