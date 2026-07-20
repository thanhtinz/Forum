import { db } from '@/lib/db';
import { PostCard, type PostCardData } from '@/components/PostCard';

/** Bài viết liên quan — cùng chuyên mục, mới nhất, loại trừ bài hiện tại. */
export async function RelatedPosts({ postId, categoryId }: { postId: string; categoryId: string | null }) {
  const posts = await db.post.findMany({
    where: { status: 'PUBLISHED', id: { not: postId }, ...(categoryId ? { categoryId } : {}) },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    take: 3,
    include: {
      author: { select: { username: true, name: true, image: true } },
      category: { select: { name: true, slug: true, color: true } },
    },
  });

  if (posts.length === 0) return null;

  const cards: PostCardData[] = posts.map((p) => ({
    slug: p.slug, title: p.title, excerpt: p.excerpt, cover: p.cover,
    cardStyle: 'STANDARD', access: p.access, pricePoints: p.pricePoints, priceAmount: p.priceAmount,
    viewCount: p.viewCount, likeCount: p.likeCount, commentCount: p.commentCount,
    author: p.author, category: p.category,
  }));

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-5 w-1.5 rounded-full bg-brand-500" />
        <h2 className="text-lg font-bold">Bài viết liên quan</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => <PostCard key={c.slug} post={c} />)}
      </div>
    </section>
  );
}
