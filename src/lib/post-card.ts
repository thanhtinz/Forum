import type { Prisma } from '@prisma/client';
import type { PostCardData } from '@/components/PostCard';

/**
 * Select chuẩn để lấy đủ dữ liệu render PostCard — và KHÔNG lấy gì hơn.
 *
 * Phải là `select` liệt kê từng cột chứ không phải `include`: `include` kéo về
 * mọi cột vô hướng, trong đó có `hiddenContent`/`hiddenSource` là phần nội dung
 * chỉ người đã mua mới được xem. Trang danh sách nào lỡ đưa bản ghi thô xuống
 * component phía trình duyệt là lộ hàng trong mã nguồn trang cho cả khách vãng lai.
 *
 * Thêm cột mới ở đây thì nhớ tự hỏi: cột này có nên để người chưa mua đọc không?
 */
export const postCardSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  cover: true,
  cardStyle: true,
  access: true,
  pricePoints: true,
  priceAmount: true,
  viewCount: true,
  likeCount: true,
  commentCount: true,
  pinned: true,
  featured: true,
  publishedAt: true,
  createdAt: true,
  authorId: true,
  author: { select: { username: true, name: true, image: true } },
  category: { select: { name: true, slug: true, color: true } },
  categories: { select: { category: { select: { name: true, slug: true, color: true } } } },
  tags: { select: { tag: { select: { name: true, slug: true } } }, take: 6 },
} satisfies Prisma.PostSelect;

type PostWithCard = Prisma.PostGetPayload<{ select: typeof postCardSelect }>;

/** Chuyển bản ghi Post (kèm select trên) thành dữ liệu cho PostCard. */
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
