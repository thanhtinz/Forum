import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TagService {
  constructor(private readonly prisma: PrismaService) {}

  // Danh sách thẻ + usageCount + followerCount (+ isFollowing nếu có user)
  async listTags(params: { q?: string; limit?: number; userId?: string }) {
    const limit = Math.min(params.limit ?? 50, 100);
    const where: any = {};
    if (params.q?.trim()) {
      where.name = { contains: params.q.trim(), mode: 'insensitive' };
    }

    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: { usageCount: 'desc' },
      take: limit,
      include: { _count: { select: { followers: true } } },
    });

    let followedSet = new Set<string>();
    if (params.userId && tags.length) {
      const follows = await this.prisma.userTagFollow.findMany({
        where: { userId: params.userId, tagId: { in: tags.map((t) => t.id) } },
        select: { tagId: true },
      });
      followedSet = new Set(follows.map((f) => f.tagId));
    }

    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color,
      usageCount: t.usageCount,
      followerCount: t._count.followers,
      isFollowing: followedSet.has(t.id),
    }));
  }

  // Chi tiết một thẻ theo slug
  async getTag(slug: string, userId?: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { slug },
      include: { _count: { select: { followers: true } } },
    });
    if (!tag) throw new NotFoundException('Không tìm thấy thẻ');

    let isFollowing = false;
    if (userId) {
      const f = await this.prisma.userTagFollow.findUnique({
        where: { userId_tagId: { userId, tagId: tag.id } },
      });
      isFollowing = !!f;
    }

    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      color: tag.color,
      usageCount: tag.usageCount,
      followerCount: tag._count.followers,
      isFollowing,
    };
  }

  // Theo dõi / bỏ theo dõi thẻ
  async toggleFollow(userId: string, tagId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id: tagId }, select: { id: true } });
    if (!tag) throw new NotFoundException('Không tìm thấy thẻ');

    const existing = await this.prisma.userTagFollow.findUnique({
      where: { userId_tagId: { userId, tagId } },
    });

    if (existing) {
      await this.prisma.userTagFollow.delete({ where: { userId_tagId: { userId, tagId } } });
      return { following: false };
    }

    await this.prisma.userTagFollow.create({ data: { userId, tagId } });
    return { following: true };
  }

  // Danh sách thẻ mà user đang theo dõi
  async listFollowed(userId: string) {
    const follows = await this.prisma.userTagFollow.findMany({
      where: { userId },
      include: { tag: { include: { _count: { select: { followers: true } } } } },
    });

    return follows
      .map((f) => ({
        id: f.tag.id,
        name: f.tag.name,
        slug: f.tag.slug,
        color: f.tag.color,
        usageCount: f.tag.usageCount,
        followerCount: f.tag._count.followers,
        isFollowing: true,
      }))
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  // Threads có thẻ này (đã duyệt), mới nhất theo lastPostAt
  async threadsForTag(tagId: string, page = 1, limit = 20) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const where: any = { isApproved: true, tags: { some: { tagId } } };

    const [threads, total] = await Promise.all([
      this.prisma.thread.findMany({
        where,
        skip,
        take,
        orderBy: [{ isPinned: 'desc' }, { lastPostAt: 'desc' }],
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          category: { select: { id: true, name: true, slug: true, color: true } },
          tags: { include: { tag: true } },
        },
      }),
      this.prisma.thread.count({ where }),
    ]);

    return {
      data: threads,
      meta: { total, page, limit: take, totalPages: Math.ceil(total / take) },
    };
  }
}
