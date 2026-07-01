import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const USER_BASIC = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
  role: true,
} as const;

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cập nhật thời điểm hoạt động cuối của người dùng. */
  async heartbeat(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date() },
    });
    return { ok: true };
  }

  /** Danh sách người dùng đang trực tuyến trong khoảng `withinMinutes` phút. */
  async onlineUsers(withinMinutes = 5) {
    const since = new Date(Date.now() - withinMinutes * 60_000);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { lastSeenAt: { gte: since } },
        select: { ...USER_BASIC, lastSeenAt: true },
        orderBy: { lastSeenAt: 'desc' },
        take: 50,
      }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: since } } }),
    ]);

    return { total, users };
  }

  /** Người dùng đang xem một chủ đề trong khoảng `withinMinutes` phút. */
  async viewingThread(threadId: string, withinMinutes = 5) {
    const since = new Date(Date.now() - withinMinutes * 60_000);

    const views = await this.prisma.threadView.findMany({
      where: { threadId, viewedAt: { gte: since } },
      select: {
        viewedAt: true,
        user: { select: USER_BASIC },
      },
      orderBy: { viewedAt: 'desc' },
      take: 50,
    });

    const users = views.map((v) => ({ ...v.user, viewedAt: v.viewedAt }));
    return { total: users.length, users };
  }
}
