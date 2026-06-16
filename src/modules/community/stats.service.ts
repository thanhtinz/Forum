import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type StatsPeriod = 'week' | 'month' | 'all';

const USER_BASIC = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  role: true,
} as const;

function periodStart(period: StatsPeriod): Date | null {
  if (period === 'all') return null;
  const days = period === 'week' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60_000);
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Xếp hạng người dùng theo số cảm xúc (reaction) NHẬN được trên bài viết của họ.
   * PostReaction có `createdAt` nên có thể lọc theo khoảng thời gian.
   * Gom nhóm qua quan hệ post.authorId thực hiện trong JS.
   */
  async reactionLeaderboard(opts: { period?: StatsPeriod; limit?: number } = {}) {
    const period = opts.period ?? 'all';
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const since = periodStart(period);

    const reactions = await this.prisma.postReaction.findMany({
      where: {
        ...(since ? { createdAt: { gte: since } } : {}),
        post: { isDeleted: false, isApproved: true },
      },
      select: { post: { select: { authorId: true } } },
      // Giới hạn hợp lý để tránh tải quá nhiều bản ghi.
      take: 50_000,
    });

    const counts = new Map<string, number>();
    for (const r of reactions) {
      const authorId = r.post?.authorId;
      if (!authorId) continue;
      counts.set(authorId, (counts.get(authorId) ?? 0) + 1);
    }

    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    const authors = await this.prisma.user.findMany({
      where: { id: { in: ranked.map(([id]) => id) } },
      select: USER_BASIC,
    });
    const byId = new Map(authors.map((u) => [u.id, u]));

    return {
      period,
      data: ranked
        .map(([id, reactionsReceived]) => {
          const user = byId.get(id);
          return user ? { ...user, reactionsReceived } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    };
  }

  /**
   * Xếp hạng người dùng theo số bài viết tạo trong khoảng thời gian.
   */
  async topContributors(opts: { period?: StatsPeriod; limit?: number } = {}) {
    const period = opts.period ?? 'all';
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
    const since = periodStart(period);

    const grouped = await this.prisma.post.groupBy({
      by: ['authorId'],
      where: {
        isApproved: true,
        isDeleted: false,
        ...(since ? { createdAt: { gte: since } } : {}),
      },
      _count: { _all: true },
      orderBy: { _count: { authorId: 'desc' } },
      take: limit,
    });

    const authors = await this.prisma.user.findMany({
      where: { id: { in: grouped.map((g) => g.authorId) } },
      select: USER_BASIC,
    });
    const byId = new Map(authors.map((u) => [u.id, u]));

    return {
      period,
      data: grouped
        .map((g) => {
          const user = byId.get(g.authorId);
          return user ? { ...user, postCount: g._count._all } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    };
  }

  /** Số liệu tổng quan của diễn đàn. */
  async forumStats() {
    const onlineSince = new Date(Date.now() - 5 * 60_000);

    const [totalMembers, totalThreads, totalPosts, newestMember, onlineCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.thread.count(),
        this.prisma.post.count({ where: { isDeleted: false } }),
        this.prisma.user.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { id: true, username: true, displayName: true, avatar: true },
        }),
        this.prisma.user.count({ where: { lastSeenAt: { gte: onlineSince } } }),
      ]);

    return {
      totalMembers,
      totalThreads,
      totalPosts,
      newestMember,
      onlineCount,
    };
  }
}
