'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { grantPoints } from '@/lib/points';

export interface WriteState {
  error?: string;
}

// Bài thành viên đăng: mặc định chờ duyệt hay đăng ngay (đổi được sau ở phần cấu hình).
const AUTO_PUBLISH = true;
const POINTS_PER_POST = 10;

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Chuyển văn bản thành các đoạn <p> đã escape (an toàn, chống XSS). */
function toParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function toSlug(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'bai-viet';
}

export async function createPost(_prev: WriteState, formData: FormData): Promise<WriteState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để đăng bài.' };

  const title = String(formData.get('title') ?? '').trim();
  const excerpt = String(formData.get('excerpt') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const cover = String(formData.get('cover') ?? '').trim();
  const cardStyle = String(formData.get('cardStyle') ?? 'STANDARD');
  const catSlugs = formData.getAll('categories').map(String).filter(Boolean);
  const tagRaw = String(formData.get('tags') ?? '');

  // Bán nội dung
  const ACCESS = ['FREE', 'LOGIN_REQUIRED', 'POINTS', 'PAID', 'VIP_ONLY'];
  const access = ACCESS.includes(String(formData.get('access'))) ? String(formData.get('access')) : 'FREE';
  const pricePoints = Math.max(0, Math.floor(Number(formData.get('pricePoints') ?? 0) || 0));
  const priceAmount = Math.max(0, Math.floor(Number(formData.get('priceAmount') ?? 0) || 0));
  const hiddenContent = String(formData.get('hiddenContent') ?? '').trim();
  const isPaid = access === 'POINTS' || access === 'PAID' || access === 'VIP_ONLY';

  if (title.length < 5) return { error: 'Tiêu đề tối thiểu 5 ký tự.' };
  if (content.length < 20) return { error: 'Nội dung quá ngắn (tối thiểu 20 ký tự).' };
  if (catSlugs.length === 0) return { error: 'Hãy chọn ít nhất 1 chuyên mục.' };
  if (access === 'POINTS' && pricePoints <= 0) return { error: 'Hãy nhập giá bằng điểm (> 0).' };
  if (access === 'PAID' && priceAmount <= 0) return { error: 'Hãy nhập giá bằng tiền (> 0).' };
  if (isPaid && hiddenContent.length < 10) return { error: 'Hãy nhập phần nội dung ẩn (sau khi mua mới xem được).' };

  // slug duy nhất
  let slug = toSlug(title);
  if (await db.post.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const cats = await db.category.findMany({ where: { slug: { in: catSlugs } }, select: { id: true } });
  const status = AUTO_PUBLISH ? 'PUBLISHED' : 'PENDING';

  const post = await db.post.create({
    data: {
      slug, title,
      excerpt: excerpt || null,
      content: toParagraphs(content),
      hiddenContent: isPaid && hiddenContent ? toParagraphs(hiddenContent) : null,
      cover: cover || null,
      cardStyle: cardStyle as never,
      status: status as never,
      access: access as never,
      pricePoints: access === 'POINTS' ? pricePoints : null,
      priceAmount: access === 'PAID' ? priceAmount : null,
      publishedAt: AUTO_PUBLISH ? new Date() : null,
      authorId: userId,
      categoryId: cats[0]?.id ?? null,
      categories: { create: cats.map((c) => ({ categoryId: c.id })) },
    },
    select: { id: true, slug: true },
  });

  // Tag: tách theo dấu phẩy, upsert rồi nối
  const tagNames = [...new Set(tagRaw.split(',').map((t) => t.trim()).filter(Boolean))].slice(0, 8);
  for (const name of tagNames) {
    const tslug = toSlug(name);
    const tag = await db.tag.upsert({ where: { slug: tslug }, update: {}, create: { slug: tslug, name } });
    await db.tagsOnPosts.create({ data: { postId: post.id, tagId: tag.id } }).catch(() => {});
  }

  // Thưởng điểm khi đăng (nếu tự đăng ngay)
  if (AUTO_PUBLISH) {
    await grantPoints({ userId, amount: POINTS_PER_POST, reason: 'POST_CREATE', refId: post.id, note: `Đăng bài: ${title}` }).catch(() => {});
  }

  revalidatePath('/');
  redirect(AUTO_PUBLISH ? `/posts/${post.slug}` : '/user/write?submitted=1');
}
