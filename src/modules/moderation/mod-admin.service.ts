import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrisonService } from './prison.service';

const WARN_BAN_THRESHOLD = 3; // số cảnh cáo còn hiệu lực -> tự ban

// Hành động kiểm duyệt nhanh theo username (dùng trên mọi trang client cho admin/mod)
@Injectable()
export class ModAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly prison: PrisonService,
  ) {}

  private async target(username: string, actorId: string) {
    const u = await this.prisma.user.findUnique({ where: { username }, select: { id: true, role: true, status: true } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    if (u.id === actorId) throw new BadRequestException('Không thể tự xử lý chính mình');
    if (u.role === 'ADMIN') throw new ForbiddenException('Không thể xử lý tài khoản Admin');
    return u;
  }

  // Trạng thái nhanh cho panel
  async status(username: string) {
    const u = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, displayName: true, avatar: true, role: true, status: true, bannedUntil: true, banReason: true },
    });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    const warnings = await this.prisma.userWarning.count({ where: { userId: u.id, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
    const jailed = await this.prison.isJailed(u.id).catch(() => false);
    return { ...u, warnings, jailed };
  }

  async warn(actorId: string, username: string, reason: string, points = 1) {
    if (!reason || reason.trim().length < 3) throw new BadRequestException('Cần ghi lý do cảnh cáo');
    const u = await this.target(username, actorId);
    await this.prisma.userWarning.create({ data: { userId: u.id, warnedById: actorId, reason: reason.trim(), points: Math.max(1, points) } });
    const active = await this.prisma.userWarning.count({ where: { userId: u.id, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
    await this.notifications.notify(u.id, { type: 'SYSTEM', title: `Bạn nhận cảnh cáo (${active}/${WARN_BAN_THRESHOLD})`, body: reason.trim() }).catch(() => {});
    // Tự ban khi đủ ngưỡng
    if (active >= WARN_BAN_THRESHOLD) {
      await this.prisma.user.update({ where: { id: u.id }, data: { status: 'BANNED', banReason: `Vượt ${WARN_BAN_THRESHOLD} cảnh cáo`, bannedUntil: null } });
      await this.notifications.notify(u.id, { type: 'SYSTEM', title: 'Tài khoản bị khóa', body: `Do nhận đủ ${WARN_BAN_THRESHOLD} cảnh cáo.` }).catch(() => {});
      return { ok: true, warnings: active, autoBanned: true };
    }
    return { ok: true, warnings: active, autoBanned: false };
  }

  // Mute = giam (prison) trong X phút
  async mute(actorId: string, username: string, minutes: number, reason: string) {
    return this.prison.jail(actorId, username, minutes, reason, 0);
  }

  async ban(actorId: string, username: string, reason: string, days?: number) {
    const u = await this.target(username, actorId);
    const until = days && days > 0 ? new Date(Date.now() + days * 86400000) : null;
    await this.prisma.user.update({ where: { id: u.id }, data: { status: 'BANNED', banReason: reason?.trim() || 'Vi phạm quy định', bannedUntil: until } });
    await this.notifications.notify(u.id, { type: 'SYSTEM', title: 'Tài khoản bị khóa', body: `${reason?.trim() || ''}${until ? ` (đến ${until.toLocaleString('vi-VN')})` : ' (vĩnh viễn)'}` }).catch(() => {});
    return { ok: true, until };
  }

  async unban(actorId: string, username: string) {
    const u = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    await this.prisma.user.update({ where: { id: u.id }, data: { status: 'ACTIVE', banReason: null, bannedUntil: null } });
    return { ok: true };
  }
}
