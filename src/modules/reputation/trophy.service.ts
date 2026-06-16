import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';

// Criteria types hỗ trợ (admin cấu hình qua JSON)
type TrophyCriteria =
  | { type: 'post_count'; value: number }
  | { type: 'thread_count'; value: number }
  | { type: 'reaction_received'; value: number }
  | { type: 'reaction_given'; value: number }
  | { type: 'days_registered'; value: number }
  | { type: 'first_post' }
  | { type: 'first_thread' }
  | { type: 'reputation'; value: number }
  | { type: 'gem_spent'; value: number }
  | { type: 'level_reached'; value: number }
  | { type: 'pvp_wins'; value: number }
  | { type: 'products_sold'; value: number };

@Injectable()
export class TrophyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly notifications: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────
  // KIỂM TRA & TRAO TROPHY cho user
  // Gọi sau các action (đăng bài, nhận like, lên level...)
  // ──────────────────────────────────────────────
  async checkAndAward(userId: string): Promise<string[]> {
    const trophies = await this.prisma.trophy.findMany({
      where: { isActive: true },
    });

    // Trophy user đã có
    const owned = await this.prisma.userTrophy.findMany({
      where: { userId },
      select: { trophyId: true },
    });
    const ownedIds = new Set(owned.map((t) => t.trophyId));

    // Lấy stats user 1 lần
    const stats = await this.getUserStats(userId);

    const awarded: string[] = [];

    for (const trophy of trophies) {
      if (ownedIds.has(trophy.id)) continue; // đã có → giữ vĩnh viễn (XenForo behavior)

      if (this.meetsCriteria(trophy.criteria as TrophyCriteria, stats)) {
        await this.awardTrophy(userId, trophy);
        awarded.push(trophy.name);
      }
    }

    // Cập nhật title ladder nếu có trophy mới
    if (awarded.length > 0) {
      await this.updateUserTitle(userId);
    }

    return awarded;
  }

  // ──────────────────────────────────────────────
  // TRAO 1 TROPHY
  // ──────────────────────────────────────────────
  private async awardTrophy(userId: string, trophy: any) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userTrophy.create({
        data: { userId, trophyId: trophy.id },
      });

      // Cộng trophy points
      await tx.userTrophyStats.upsert({
        where: { userId },
        update: { totalPoints: { increment: trophy.points } },
        create: { userId, totalPoints: trophy.points },
      });
    });

    // Notify (trừ trophy ẩn thì vẫn báo)
    await this.notifications.notify(userId, {
      type: 'SYSTEM',
      title: `Đạt danh hiệu: ${trophy.name}`,
      body: trophy.description,
      link: '/profile/trophies',
    });

    this.events.emit('trophy.awarded', { userId, trophy: trophy.name, points: trophy.points });
  }

  // ──────────────────────────────────────────────
  // CẬP NHẬT USER TITLE theo mốc điểm
  // ──────────────────────────────────────────────
  async updateUserTitle(userId: string) {
    const stats = await this.prisma.userTrophyStats.findUnique({ where: { userId } });
    if (!stats) return;

    // Tìm title cao nhất user đạt được
    const title = await this.prisma.userTitle.findFirst({
      where: { minPoints: { lte: stats.totalPoints } },
      orderBy: { minPoints: 'desc' },
    });

    if (title && title.name !== stats.currentTitle) {
      await this.prisma.userTrophyStats.update({
        where: { userId },
        data: { currentTitle: title.name },
      });
      this.events.emit('title.changed', { userId, title: title.name });
      return title.name;
    }
    return stats.currentTitle;
  }

  // ──────────────────────────────────────────────
  // LẤY TROPHY CỦA USER (cho profile)
  // ──────────────────────────────────────────────
  async getUserTrophies(userId: string) {
    const [userTrophies, stats, allTrophies] = await Promise.all([
      this.prisma.userTrophy.findMany({
        where: { userId },
        include: { trophy: true },
        orderBy: { awardedAt: 'desc' },
      }),
      this.prisma.userTrophyStats.findUnique({ where: { userId } }),
      this.prisma.trophy.count({ where: { isActive: true, isHidden: false } }),
    ]);

    return {
      trophies: userTrophies.map((ut) => ut.trophy),
      totalPoints: stats?.totalPoints ?? 0,
      currentTitle: stats?.currentTitle ?? 'Thành viên mới',
      earned: userTrophies.length,
      total: allTrophies,
    };
  }

  // ──────────────────────────────────────────────
  // LẤY STATS để check criteria
  // ──────────────────────────────────────────────
  private async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        postCount: true,
        threadCount: true,
        reputationScore: true,
        createdAt: true,
        gemWallet: { select: { totalSpent: true } },
        gameCharacter: { select: { level: true, pvpWins: true } },
      },
    });

    // Reaction nhận được (đếm reaction trên các post của user)
    const reactionsReceived = await this.prisma.postReaction.count({
      where: { post: { authorId: userId } },
    });
    const reactionsGiven = await this.prisma.postReaction.count({
      where: { userId },
    });

    const productsSold = await this.prisma.order.count({
      where: { product: { sellerId: userId }, status: 'COMPLETED' },
    });

    const daysRegistered = user
      ? Math.floor((Date.now() - user.createdAt.getTime()) / 86400000)
      : 0;

    return {
      post_count: user?.postCount ?? 0,
      thread_count: user?.threadCount ?? 0,
      reaction_received: reactionsReceived,
      reaction_given: reactionsGiven,
      days_registered: daysRegistered,
      reputation: user?.reputationScore ?? 0,
      gem_spent: user?.gemWallet?.totalSpent ?? 0,
      level_reached: user?.gameCharacter?.level ?? 0,
      pvp_wins: user?.gameCharacter?.pvpWins ?? 0,
      products_sold: productsSold,
      first_post: (user?.postCount ?? 0) >= 1,
      first_thread: (user?.threadCount ?? 0) >= 1,
    };
  }

  private meetsCriteria(criteria: TrophyCriteria, stats: any): boolean {
    switch (criteria.type) {
      case 'first_post': return stats.first_post;
      case 'first_thread': return stats.first_thread;
      case 'post_count': return stats.post_count >= criteria.value;
      case 'thread_count': return stats.thread_count >= criteria.value;
      case 'reaction_received': return stats.reaction_received >= criteria.value;
      case 'reaction_given': return stats.reaction_given >= criteria.value;
      case 'days_registered': return stats.days_registered >= criteria.value;
      case 'reputation': return stats.reputation >= criteria.value;
      case 'gem_spent': return stats.gem_spent >= criteria.value;
      case 'level_reached': return stats.level_reached >= criteria.value;
      case 'pvp_wins': return stats.pvp_wins >= criteria.value;
      case 'products_sold': return stats.products_sold >= criteria.value;
      default: return false;
    }
  }
}
