import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { SITE_URL } from '@/lib/site';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

export const revalidate = 3600; // làm mới mỗi giờ

/**
 * Sitemap được prerender lúc `next build` rồi làm mới mỗi giờ (ISR). Máy build
 * trên CI thường không có database, nên mỗi truy vấn phải chịu được lỗi kết nối:
 * thiếu dữ liệu thì vẫn xuất các trang tĩnh, lần regenerate sau sẽ đủ.
 */
async function safe<T>(query: Promise<T[]>): Promise<T[]> {
  try {
    return await query;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => `${SITE_URL}${path}`;

  const [tags, forums, threads, games, genres, collections] = await Promise.all([
    safe(db.tag.findMany({ select: { slug: true }, take: 1000 })),
    safe(db.forum.findMany({ take: CONFIG_LIST_CAP, select: { slug: true } })),
    // Chỉ chủ đề đã đăng: chủ đề đang chờ duyệt hoặc đã ẩn thì trang của nó
    // trả 404, mà vẫn nằm trong sitemap là tự mời máy tìm kiếm đi vào ngõ cụt —
    // tệ hơn nữa là lộ ra rằng có một chủ đề như thế ở đúng địa chỉ ấy.
    safe(db.thread.findMany({ where: { status: 'PUBLISHED' }, select: { id: true, updatedAt: true, forum: { select: { slug: true } } }, orderBy: { updatedAt: 'desc' }, take: 5000 })),
    safe(db.game.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 5000 })),
    safe(db.gameGenre.findMany({ take: CONFIG_LIST_CAP, select: { slug: true } })),
    safe(db.gameCollection.findMany({ take: CONFIG_LIST_CAP, select: { slug: true } })),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: url('/'), changeFrequency: 'daily', priority: 1 },
    { url: url('/clb'), changeFrequency: 'daily', priority: 0.6 },
    { url: url('/games'), changeFrequency: 'daily', priority: 0.8 },
    { url: url('/games/browse'), changeFrequency: 'daily', priority: 0.6 },
    { url: url('/games/collections'), changeFrequency: 'weekly', priority: 0.5 },
    { url: url('/search'), changeFrequency: 'weekly', priority: 0.3 },
  ];

  return [
    ...staticPages,
    ...tags.map((t) => ({ url: url(`/tag/${t.slug}`), changeFrequency: 'weekly' as const, priority: 0.4 })),
    ...forums.map((f) => ({ url: url(`/forum/${f.slug}`), changeFrequency: 'daily' as const, priority: 0.5 })),
    ...threads.filter((t) => t.forum).map((t) => ({ url: url(`/forum/${t.forum!.slug}/${t.id}`), lastModified: t.updatedAt, changeFrequency: 'weekly' as const, priority: 0.5 })),
    // Kho game: trang chi tiết + trang lọc theo thể loại + bộ sưu tập.
    ...games.map((g) => ({ url: url(`/games/${g.slug}`), lastModified: g.updatedAt, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...genres.map((g) => ({ url: url(`/games/browse?genre=${g.slug}`), changeFrequency: 'daily' as const, priority: 0.4 })),
    ...collections.map((c) => ({ url: url(`/games/collections/${c.slug}`), changeFrequency: 'weekly' as const, priority: 0.5 })),
  ];
}
