import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type SearchType = 'all' | 'thread' | 'post' | 'user' | 'product' | 'storefront';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  // Tìm kiếm tổng hợp. Dùng ILIKE của Postgres (contains + insensitive).
  // Có thể thay bằng Meilisearch ở tầng hạ tầng sau này.
  async search(query: string, type: SearchType = 'all', limit = 10) {
    const q = query.trim();
    if (q.length < 2) {
      return { query: q, results: {} };
    }
    const take = Math.min(Math.max(limit, 1), 50);

    const wantAll = type === 'all';
    const tasks: Record<string, Promise<unknown>> = {};

    if (wantAll || type === 'thread') tasks.threads = this.searchThreads(q, take);
    if (wantAll || type === 'post') tasks.posts = this.searchPosts(q, take);
    if (wantAll || type === 'user') tasks.users = this.searchUsers(q, take);
    if (wantAll || type === 'product') tasks.products = this.searchProducts(q, take);
    if (wantAll || type === 'storefront')
      tasks.storefronts = this.searchStorefronts(q, take);

    const keys = Object.keys(tasks);
    const values = await Promise.all(keys.map((k) => tasks[k]));
    const results: Record<string, unknown> = {};
    keys.forEach((k, i) => (results[k] = values[i]));

    return { query: q, results };
  }

  private searchThreads(q: string, take: number) {
    return this.prisma.thread.findMany({
      where: { title: { contains: q, mode: 'insensitive' } },
      take,
      orderBy: [{ isPinned: 'desc' }, { likeCount: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        replyCount: true,
        viewCount: true,
        createdAt: true,
      },
    });
  }

  private searchPosts(q: string, take: number) {
    return this.prisma.post.findMany({
      where: {
        isDeleted: false,
        contentRaw: { contains: q, mode: 'insensitive' },
      },
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        threadId: true,
        likeCount: true,
        createdAt: true,
        author: { select: { id: true, username: true, displayName: true } },
      },
    });
  }

  private searchUsers(q: string, take: number) {
    return this.prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
      take,
      select: { id: true, username: true, displayName: true, avatar: true, role: true },
    });
  }

  private searchProducts(q: string, take: number) {
    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { descriptionRaw: { contains: q, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { salesCount: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        gemPrice: true,
        isFree: true,
        thumbnailUrl: true,
        salesCount: true,
      },
    });
  }

  private searchStorefronts(q: string, take: number) {
    return this.prisma.storefront.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { tagline: { contains: q, mode: 'insensitive' } },
        ],
      },
      take,
      orderBy: { followerCount: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        tagline: true,
        logoUrl: true,
        isVerified: true,
        followerCount: true,
      },
    });
  }
}
