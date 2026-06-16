import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface NotifyPayload {
  type: NotifType;
  title: string;
  body?: string;
  link?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async notify(userId: string, payload: NotifyPayload) {
    const notif = await this.prisma.notification.create({
      data: {
        userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        link: payload.link,
        actorId: payload.actorId,
        targetType: payload.targetType,
        targetId: payload.targetId,
      },
    });

    // Emit realtime event → Socket.IO gateway sẽ push tới client
    this.events.emit('notification.created', { userId, notification: notif });

    return notif;
  }

  async markRead(notifId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notifId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data: items, meta: { total, page, limit, unreadCount } };
  }
}
