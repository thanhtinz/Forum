import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export type MemberSortBy = 'recent' | 'posts' | 'reputation' | 'trophies';

export interface MembersQuery {
  page?: number;
  limit?: number;
  sortBy?: MemberSortBy;
  q?: string;
}

const USER_CARD = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  role: true,
  postCount: true,
  reputationScore: true,
  createdAt: true,
} as const;

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ page = 1, limit = 24, sortBy = 'recent', q }: MembersQuery) {
    const take = Math.min(Math.max(Number(limit) || 24, 1), 60);
    const pageNum = Math.max(Number(page) || 1, 1);
    const skip = (pageNum - 1) * take;

    const where: Prisma.UserWhereInput = q?.trim()
      ? {
          OR: [
            { username: { contains: q.trim(), mode: 'insensitive' } },
            { displayName: { contains: q.trim(), mode: 'insensitive' } },
          ],
        }
      : {};

    // 'trophies' không có cột trực tiếp trên User (nằm ở UserTrophyStats),
    // nên xử lý riêng bằng cách gộp điểm cúp sau khi truy vấn.
    if (sortBy === 'trophies') {
      return this.listByTrophies(where, pageNum, take, skip);
    }

    const orderBy: Prisma.UserOrderByWithRelationInput =
      sortBy === 'posts'
        ? { postCount: 'desc' }
        : sortBy === 'reputation'
          ? { reputationScore: 'desc' }
          : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy, skip, take, select: USER_CARD }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page: pageNum, limit: take, sortBy } };
  }

  private async listByTrophies(
    where: Prisma.UserWhereInput,
    pageNum: number,
    take: number,
    skip: number,
  ) {
    // Lấy toàn bộ user khớp filter (giới hạn hợp lý) rồi sắp theo điểm cúp.
    const users = await this.prisma.user.findMany({
      where,
      select: USER_CARD,
      take: 500,
    });
    const total = await this.prisma.user.count({ where });

    const stats = await this.prisma.userTrophyStats.findMany({
      where: { userId: { in: users.map((u) => u.id) } },
      select: { userId: true, totalPoints: true },
    });
    const pointsMap = new Map(stats.map((s) => [s.userId, s.totalPoints]));

    const enriched = users
      .map((u) => ({ ...u, trophyPoints: pointsMap.get(u.id) ?? 0 }))
      .sort((a, b) => b.trophyPoints - a.trophyPoints);

    const data = enriched.slice(skip, skip + take);
    return { data, meta: { total, page: pageNum, limit: take, sortBy: 'trophies' } };
  }
}
