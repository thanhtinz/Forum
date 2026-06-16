import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Core Subscriptions — theo dõi thread, nhận thông báo khi có trả lời mới
@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async toggle(threadId: string, userId: string) {
    const thread = await this.prisma.thread.findUnique({ where: { id: threadId }, select: { id: true } });
    if (!thread) throw new NotFoundException('Thread không tồn tại');
    const existing = await this.prisma.threadSubscription.findUnique({
      where: { threadId_userId: { threadId, userId } },
    });
    if (existing) {
      await this.prisma.threadSubscription.delete({ where: { id: existing.id } });
      return { subscribed: false };
    }
    await this.prisma.threadSubscription.create({ data: { threadId, userId } });
    return { subscribed: true };
  }

  // Tự động theo dõi (khi tạo thread / trả lời) — không lỗi nếu đã có
  async ensure(threadId: string, userId: string) {
    await this.prisma.threadSubscription.upsert({
      where: { threadId_userId: { threadId, userId } },
      update: {},
      create: { threadId, userId },
    }).catch(() => {});
  }

  async isSubscribed(threadId: string, userId: string) {
    const s = await this.prisma.threadSubscription.findUnique({ where: { threadId_userId: { threadId, userId } } });
    return !!s;
  }

  // Thông báo cho tất cả người theo dõi (trừ người vừa đăng & tác giả đã được notify riêng)
  async notifyNewReply(threadId: string, threadTitle: string, threadSlug: string, postId: string, actorId: string, excludeUserIds: string[] = []) {
    const exclude = new Set([actorId, ...excludeUserIds]);
    const subs = await this.prisma.threadSubscription.findMany({
      where: { threadId, userId: { notIn: [...exclude] } },
      select: { userId: true },
    });
    await Promise.all(subs.map((s) =>
      this.notifications.notify(s.userId, {
        type: 'THREAD_REPLY',
        title: 'Chủ đề bạn theo dõi có trả lời mới',
        body: threadTitle,
        link: `/forum/${threadSlug}#post-${postId}`,
        actorId,
      }).catch(() => {}),
    ));
    return subs.length;
  }

  async listMine(userId: string) {
    return this.prisma.threadSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        thread: {
          select: { id: true, title: true, slug: true, replyCount: true, lastPostAt: true,
            category: { select: { name: true, color: true } } },
        },
      },
    });
  }
}
