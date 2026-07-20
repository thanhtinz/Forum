import type { Prisma } from '@prisma/client';
import type { PostCardData } from '@/components/PostCard';

/** Include chuẩn để lấy đủ dữ liệu render PostCard. */
export const postCardInclude = {
  author: { select: { username: true, name: true, image: true } },
  category: { select: { name: true, slug: true, color: true } },
  categories: { include: { category: { select: { name: true, slug: true, color: true } } } },
  tags: { include: { tag: { select: { name: true, slug: true } } }, take: 6 },
} satisfies Prisma.PostInclude;

type PostWithCard = Prisma.PostGetPayload<{ include: typeof postCardInclude }>;

/** Chuyển bản ghi Post (kèm include trên) thành dữ liệu cho PostCard. */
export function toCardData(p: PostWithCard): PostCardData {
  return {
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    cover: p.cover,
    cardStyle: p.cardStyle,
    access: p.access,
    pricePoints: p.pricePoints,
    priceAmount: p.priceAmount,
    viewCount: p.viewCount,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    author: p.author,
    category: p.category,
    categories: p.categories.map((c) => c.category),
    tags: p.tags.map((t) => t.tag),
  };
}
