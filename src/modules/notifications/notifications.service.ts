import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotifType } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PushService } from './push.service';
import { MailService } from '../mail/mail.service';

interface NotifyPayload {
  type: NotifType;
  title: string;
  body?: string;
  link?: string;
  actorId?: string;
  targetType?: string;
  targetId?: string;
}

// Loại thông báo gửi kèm email (tránh gửi mail cho mọi loại) — cũng là danh sách
// loại có thể tuỳ chỉnh riêng trong trang cài đặt thông báo.
const EMAIL_TYPES = ['THREAD_REPLY', 'POST_MENTION', 'BEST_ANSWER', 'GEM_RECEIVED'];
export const NOTIF_TYPE_LABELS: Record<string, string> = {
  THREAD_REPLY: 'Có trả lời trong chủ đề bạn theo dõi',
  POST_MENTION: 'Được nhắc tên (@mention)',
  BEST_ANSWER: 'Câu trả lời được chọn hay nhất',
  GEM_RECEIVED: 'Nhận được Gem/donate',
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly push: PushService,
    private readonly mail: MailService,
  ) {}

  async notify(userId: string, payload: NotifyPayload, opts: { email?: boolean } = {}) {
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

    // Web push (fire-and-forget)
    const base = (process.env.FRONTEND_URL || '').split(',')[0].replace(/\/$/, '');
    this.push.sendToUser(userId, { title: payload.title, body: payload.body, link: payload.link ? `${base}${payload.link}` : (base || '/') }).catch(() => {});

    // Email (fire-and-forget) — chỉ loại quan trọng + user bật + SMTP bật (có thể ép bật/tắt qua opts.email)
    const wantEmail = opts.email ?? EMAIL_TYPES.includes(payload.type);
    if (wantEmail) this.sendNotifyEmail(userId, payload).catch(() => {});

    return notif;
  }

  private async sendNotifyEmail(userId: string, payload: NotifyPayload) {
    if (!(await this.mail.isEnabled())) return;
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailNotify: true, notifyPrefs: true } });
    if (!user?.emailNotify || !user.email) return;
    const prefs = (user.notifyPrefs as Record<string, boolean> | null) ?? {};
    if (prefs[payload.type] === false) return; // user đã tắt riêng loại này
    const base = (process.env.FRONTEND_URL || '').split(',')[0].replace(/\/$/, '');
    const url = payload.link ? `${base}${payload.link}` : base;
    await this.mail.send(user.email, payload.title, this.mail.layout(payload.title, payload.body || '', url || undefined, url ? 'Xem ngay' : undefined));
  }

  // Bật/tắt nhận email thông báo (công tắc tổng)
  async setEmailNotify(userId: string, value: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { emailNotify: value } });
    return { emailNotify: value };
  }
  async getEmailNotify(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { emailNotify: true } });
    return { emailNotify: u?.emailNotify ?? true };
  }

  // Tuỳ chỉnh email theo từng loại thông báo
  async getNotifyPrefs(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { notifyPrefs: true } });
    const stored = (u?.notifyPrefs as Record<string, boolean> | null) ?? {};
    const prefs: Record<string, boolean> = {};
    for (const type of Object.keys(NOTIF_TYPE_LABELS)) prefs[type] = stored[type] !== false;
    return { types: NOTIF_TYPE_LABELS, prefs };
  }
  async setNotifyPrefs(userId: string, prefs: Record<string, boolean>) {
    const clean: Record<string, boolean> = {};
    for (const type of Object.keys(NOTIF_TYPE_LABELS)) {
      if (type in prefs) clean[type] = !!prefs[type];
    }
    await this.prisma.user.update({ where: { id: userId }, data: { notifyPrefs: clean } });
    return this.getNotifyPrefs(userId);
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
