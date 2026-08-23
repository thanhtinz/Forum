import { db } from '@/lib/db';
import { PostCard, type PostCardData } from '@/components/PostCard';
import { postCardSelect, toCardData } from '@/lib/post-card';

/** Bài viết liên quan — cùng chuyên mục, mới nhất, loại trừ bài hiện tại. */
export async function RelatedPosts({ postId, categoryId }: { postId: string; categoryId: string | null }) {
  const posts = await db.post.findMany({
    where: { status: 'PUBLISHED', id: { not: postId }, ...(categoryId ? { categoryId } : {}) },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 3,
    select: postCardSelect,
  });

  if (posts.length === 0) return null;

  // Khối này luôn dùng thẻ kiểu chuẩn, bất kể bài gốc đặt kiểu gì.
  const cards: PostCardData[] = posts.map((p) => ({ ...toCardData(p), cardStyle: 'STANDARD' }));

  return (
    <section className="mt-8">
      <h2 className="zib-title mb-4">Bài viết liên quan</h2>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {cards.map((c) => <PostCard key={c.slug} post={c} />)}
      </div>
    </section>
  );
}
