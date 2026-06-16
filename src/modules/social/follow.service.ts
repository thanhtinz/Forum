import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotifType } from '@prisma/client';

const USER_CARD = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  role: true,
} as const;

@Injectable()
export class FollowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async toggle(followerId: string, followingId: string): Promise<{ following: boolean }> {
    if (followerId === followingId) {
      throw new BadRequestException('Không thể tự theo dõi chính mình');
    }

    const existing = await this.prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      await this.prisma.userFollow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
      return { following: false };
    }

    await this.prisma.userFollow.create({ data: { followerId, followingId } });

    const actor = await this.prisma.user.findUnique({
      where: { id: followerId },
      select: { username: true, displayName: true },
    });
    const actorName = actor?.displayName || actor?.username || 'Ai đó';

    await this.notifications.notify(followingId, {
      type: NotifType.SYSTEM,
      title: 'Có người theo dõi bạn',
      body: `${actorName} đã bắt đầu theo dõi bạn`,
      link: actor?.username ? `/profile?u=${actor.username}` : undefined,
      actorId: followerId,
      targetType: 'user',
      targetId: followerId,
    });

    return { following: true };
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!followerId || followerId === followingId) return false;
    const existing = await this.prisma.userFollow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    return !!existing;
  }

  async listFollowers(userId: string) {
    const rows = await this.prisma.userFollow.findMany({
      where: { followingId: userId },
      orderBy: { createdAt: 'desc' },
      include: { follower: { select: USER_CARD } },
    });
    return rows.map((r) => r.follower);
  }

  async listFollowing(userId: string) {
    const rows = await this.prisma.userFollow.findMany({
      where: { followerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { following: { select: USER_CARD } },
    });
    return rows.map((r) => r.following);
  }

  async counts(userId: string): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
      this.prisma.userFollow.count({ where: { followingId: userId } }),
      this.prisma.userFollow.count({ where: { followerId: userId } }),
    ]);
    return { followers, following };
  }
}
