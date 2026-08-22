'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { WriteState } from '@/app/(site)/user/write/actions';
import { parsePostForm } from '@/lib/post-form';

/** Chỉ tác giả (hoặc ADMIN/MODERATOR) mới được sửa/xoá. */
async function assertCanEdit(postId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' as const };

  const post = await db.post.findUnique({ where: { id: postId }, select: { authorId: true, slug: true } });
  if (!post) return { error: 'Không tìm thấy bài viết.' as const };

  const role = (session.user as { role?: string }).role;
  const isStaff = role === 'ADMIN' || role === 'MODERATOR';
  if (post.authorId !== userId && !isStaff) return { error: 'Bạn không có quyền với bài viết này.' as const };

  return { userId, post };
}

export async function updatePost(_prev: WriteState, formData: FormData): Promise<WriteState> {
  const postId = String(formData.get('postId') ?? '');
  if (!postId) return { error: 'Thiếu thông tin bài viết.' };

  const guard = await assertCanEdit(postId);
  if ('error' in guard) return { error: guard.error };

  const parsed = await parsePostForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const { data, catIds, tagNames, downloads } = parsed;

  await db.$transaction(async (tx) => {
    await tx.post.update({ where: { id: postId }, data });

    // Chuyên mục: đặt lại toàn bộ liên kết
    await tx.categoriesOnPosts.deleteMany({ where: { postId } });
    if (catIds.length > 0) {
      await tx.categoriesOnPosts.createMany({ data: catIds.map((categoryId) => ({ postId, categoryId })) });
      await tx.post.update({ where: { id: postId }, data: { categoryId: catIds[0] } });
    }

    // Tệp tải xuống: thay bằng danh sách mới
    await tx.downloadItem.deleteMany({ where: { postId } });
    if (downloads.length > 0) {
      await tx.downloadItem.createMany({ data: downloads.map((d, i) => ({ ...d, postId, order: i })) });
    }
  });

  // Thẻ: đặt lại (upsert nằm ngoài transaction để tránh khoá lâu)
  await db.tagsOnPosts.deleteMany({ where: { postId } });
  for (const name of tagNames) {
    const tag = await db.tag.upsert({
      where: { slug: name.slug },
      update: {},
      create: { slug: name.slug, name: name.label },
    });
    await db.tagsOnPosts.create({ data: { postId, tagId: tag.id } }).catch(() => {});
  }

  const updated = await db.post.findUnique({ where: { id: postId }, select: { slug: true } });
  revalidatePath('/user/posts');
  if (updated) revalidatePath(`/posts/${updated.slug}`);
  redirect(updated ? `/posts/${updated.slug}` : '/user/posts');
}

export async function deleteOwnPost(postId: string) {
  const guard = await assertCanEdit(postId);
  if ('error' in guard) return;
  await db.post.delete({ where: { id: postId } }).catch(() => {});
  revalidatePath('/user/posts');
  revalidatePath('/');
}
