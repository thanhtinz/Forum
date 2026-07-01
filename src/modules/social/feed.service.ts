import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockService } from '../profile-extra/block.service';

const AUTHOR_CARD = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  role: true,
} as const;

export interface FeedItem {
  type: 'thread' | 'profile_post';
  id: string;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    role: string;
  };
  title?: string;
  content?: string;
  link: string;
}

@Injectable()
export class FeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly block: BlockService,
  ) {}

  async getFeed(userId: string, page = 1, limit = 20) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const pageNum = Math.max(Number(page) || 1, 1);

    const following = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const followingIds = following.map((f) => f.followingId);

    if (followingIds.length === 0) {
      return { data: [] as FeedItem[], meta: { page: pageNum, limit: take } };
    }

    const blockedIds = await this.block.getBlockedIds(userId);
    const visibleIds = followingIds.filter((id) => !blockedIds.includes(id));

    if (visibleIds.length === 0) {
      return { data: [] as FeedItem[], meta: { page: pageNum, limit: take } };
    }

    // Lấy dư (page*limit) từ mỗi nguồn rồi gộp & cắt — đủ cho feed nhỏ.
    const fetchCount = pageNum * take;

    const [threads, profilePosts] = await Promise.all([
      this.prisma.thread.findMany({
        where: { authorId: { in: visibleIds }, isApproved: true },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          author: { select: AUTHOR_CARD },
        },
      }),
      this.prisma.profilePost.findMany({
        where: { authorId: { in: visibleIds } },
        orderBy: { createdAt: 'desc' },
        take: fetchCount,
        select: {
          id: true,
          content: true,
          wallId: true,
          createdAt: true,
          author: { select: AUTHOR_CARD },
          wall: { select: { username: true } },
        },
      }),
    ]);

    const items: FeedItem[] = [
      ...threads.map(
        (t): FeedItem => ({
          type: 'thread',
          id: t.id,
          createdAt: t.createdAt,
          author: t.author,
          title: t.title,
          link: `/thread?slug=${t.slug}`,
        }),
      ),
      ...profilePosts.map(
        (p): FeedItem => ({
          type: 'profile_post',
          id: p.id,
          createdAt: p.createdAt,
          author: p.author,
          content: p.content,
          link: `/profile?u=${p.wall.username}`,
        }),
      ),
    ];

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const start = (pageNum - 1) * take;
    const paged = items.slice(start, start + take);

    return { data: paged, meta: { page: pageNum, limit: take } };
  }
}
