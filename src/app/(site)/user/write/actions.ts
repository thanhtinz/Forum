'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';
import { grantPoints } from '@/lib/points';
import { checkAndAwardMedals } from '@/lib/medals';
import { parsePostForm, toSlug } from '@/lib/post-form';

export interface WriteState {
  error?: string;
}

// Bài thành viên đăng: mặc định chờ duyệt hay đăng ngay (đổi được sau ở phần cấu hình).
const AUTO_PUBLISH = true;
const POINTS_PER_POST = 10;







export async function createPost(_prev: WriteState, formData: FormData): Promise<WriteState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để đăng bài.' };

  const rate = await checkRateLimit('post', userId);
  if (!rate.allowed) return { error: rate.message };

  const parsed = await parsePostForm(formData);
  if ('error' in parsed) return { error: parsed.error };
  const { data, catIds, tagNames, downloads } = parsed;

  // slug duy nhất
  let slug = toSlug(data.title);
  if (await db.post.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const post = await db.post.create({
    data: {
      ...data,
      slug,
      status: (AUTO_PUBLISH ? 'PUBLISHED' : 'PENDING') as never,
      publishedAt: AUTO_PUBLISH ? new Date() : null,
      authorId: userId,
      categoryId: catIds[0] ?? null,
      categories: { create: catIds.map((categoryId) => ({ categoryId })) },
    },
    select: { id: true, slug: true },
  });

  if (downloads.length > 0) {
    await db.downloadItem.createMany({ data: downloads.map((d, i) => ({ ...d, postId: post.id, order: i })) });
  }

  for (const t of tagNames) {
    const tag = await db.tag.upsert({ where: { slug: t.slug }, update: {}, create: { slug: t.slug, name: t.label } });
    await db.tagsOnPosts.create({ data: { postId: post.id, tagId: tag.id } }).catch(() => {});
  }

  // Thưởng điểm khi đăng (nếu tự đăng ngay)
  if (AUTO_PUBLISH) {
    await grantPoints({ userId, amount: POINTS_PER_POST, reason: 'POST_CREATE', refId: post.id, note: `Đăng bài: ${data.title}` }).catch(() => {});
    await checkAndAwardMedals(userId).catch(() => {});
  }

  revalidatePath('/');
  redirect(AUTO_PUBLISH ? `/posts/${post.slug}` : '/user/write?submitted=1');
}
