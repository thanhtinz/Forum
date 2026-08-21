import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600; // làm mới mỗi giờ

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => `${SITE_URL}${path}`;

  const [posts, categories, tags, forums, threads, games, genres, collections] = await Promise.all([
    db.post.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 5000 }),
    db.category.findMany({ select: { slug: true } }),
    db.tag.findMany({ select: { slug: true }, take: 1000 }),
    db.forum.findMany({ select: { slug: true } }),
    db.thread.findMany({ select: { id: true, updatedAt: true, forum: { select: { slug: true } } }, orderBy: { updatedAt: 'desc' }, take: 5000 }),
    db.game.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 5000 }),
    db.gameGenre.findMany({ select: { slug: true } }),
    db.gameCollection.findMany({ select: { slug: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: url('/'), changeFrequency: 'daily', priority: 1 },
    { url: url('/forum'), changeFrequency: 'daily', priority: 0.8 },
    { url: url('/vip'), changeFrequency: 'weekly', priority: 0.6 },
    { url: url('/games'), changeFrequency: 'daily', priority: 0.8 },
    { url: url('/games/browse'), changeFrequency: 'daily', priority: 0.6 },
    { url: url('/games/collections'), changeFrequency: 'weekly', priority: 0.5 },
    { url: url('/search'), changeFrequency: 'weekly', priority: 0.3 },
  ];

  return [
    ...staticPages,
    ...posts.map((p) => ({ url: url(`/posts/${p.slug}`), lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...categories.map((c) => ({ url: url(`/category/${c.slug}`), changeFrequency: 'daily' as const, priority: 0.5 })),
    ...tags.map((t) => ({ url: url(`/tag/${t.slug}`), changeFrequency: 'weekly' as const, priority: 0.4 })),
    ...forums.map((f) => ({ url: url(`/forum/${f.slug}`), changeFrequency: 'daily' as const, priority: 0.5 })),
    ...threads.filter((t) => t.forum).map((t) => ({ url: url(`/forum/${t.forum!.slug}/${t.id}`), lastModified: t.updatedAt, changeFrequency: 'weekly' as const, priority: 0.5 })),
    // Kho game: trang chi tiết + trang lọc theo thể loại + bộ sưu tập.
    // Trang /games/[slug]/play cố tình không đưa vào (chỉ mở trên điện thoại, đã noindex).
    ...games.map((g) => ({ url: url(`/games/${g.slug}`), lastModified: g.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...genres.map((g) => ({ url: url(`/games/browse?genre=${g.slug}`), changeFrequency: 'daily' as const, priority: 0.4 })),
    ...collections.map((c) => ({ url: url(`/games/collections/${c.slug}`), changeFrequency: 'weekly' as const, priority: 0.5 })),
  ];
}
