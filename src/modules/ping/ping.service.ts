import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export type PingScope = 'all' | 'online' | 'followers' | 'users';
const ONLINE_MINUTES = 5;
const MAX_ALL = 5000;    // trần số người nhận cho ping all/online
const MAX_USERS = 50;    // trần số user chỉ định 1 lần

interface PingDto { scope: PingScope; link: string; title?: string; body?: string; userIds?: string[] }

@Injectable()
export class PingService {
  constructor(private readonly prisma: PrismaService, private readonly notif: NotificationsService) {}

  private async resolveRecipients(actorId: string, role: string, dto: PingDto): Promise<string[]> {
    const isAdmin = role === 'ADMIN' || role === 'MODERATOR';
    if ((dto.scope === 'all' || dto.scope === 'online') && !isAdmin) {
      throw new ForbiddenException('Chỉ admin mới được ping tất cả / người đang online');
    }
    if (dto.scope === 'all') {
      const us = await this.prisma.user.findMany({ where: { status: 'ACTIVE', id: { not: actorId } }, select: { id: true }, take: MAX_ALL });
      return us.map((u) => u.id);
    }
    if (dto.scope === 'online') {
      const since = new Date(Date.now() - ONLINE_MINUTES * 60_000);
      const us = await this.prisma.user.findMany({ where: { status: 'ACTIVE', id: { not: actorId }, lastSeenAt: { gte: since } }, select: { id: true }, take: MAX_ALL });
      return us.map((u) => u.id);
    }
    if (dto.scope === 'followers') {
      const fs = await this.prisma.userFollow.findMany({ where: { followingId: actorId }, select: { followerId: true } });
      return fs.map((f) => f.followerId).filter((id) => id !== actorId);
    }
    // users cụ thể
    const ids = Array.from(new Set((dto.userIds || []).filter(Boolean))).filter((id) => id !== actorId).slice(0, MAX_USERS);
    if (ids.length === 0) throw new BadRequestException('Chưa chọn người để ping');
    const exist = await this.prisma.user.findMany({ where: { id: { in: ids }, status: 'ACTIVE' }, select: { id: true } });
    return exist.map((u) => u.id);
  }

  async ping(actorId: string, role: string, dto: PingDto) {
    if (!dto?.link) throw new BadRequestException('Thiếu liên kết bài viết');
    const recipients = await this.resolveRecipients(actorId, role, dto);
    if (recipients.length === 0) return { sent: 0 };

    const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { displayName: true, username: true } });
    const who = actor?.displayName || actor?.username || 'Ai đó';
    const title = dto.title?.trim() || `${who} đã ping bạn`;
    const body = dto.body?.trim() || 'Bạn được nhắc tới — bấm để xem.';
    // Email cho phạm vi nhỏ/chủ đích (followers/users); all/online chỉ app+push để tránh gửi mail hàng loạt
    const email = dto.scope === 'followers' || dto.scope === 'users';

    let sent = 0;
    for (const uid of recipients) {
      try {
        await this.notif.notify(uid, { type: 'POST_MENTION', title, body, link: dto.link, actorId }, { email });
        sent++;
      } catch { /* bỏ qua 1 người lỗi */ }
    }
    return { sent };
  }
}
