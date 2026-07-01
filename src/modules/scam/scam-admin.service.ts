import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScamCaseStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScamService } from './scam.service';
import { AdminStatusDto, BlacklistDto, BroadcastDto } from './scam.dto';

@Injectable()
export class ScamAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly scam: ScamService,
  ) {}

  async listCases(params: { status?: ScamCaseStatus; q?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 30));
    const where: Prisma.ScamCaseWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.q ? { OR: [{ title: { contains: params.q, mode: 'insensitive' } }, { targetName: { contains: params.q, mode: 'insensitive' } }] } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.scamCase.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
        include: {
          reporter: { select: { id: true, username: true } },
          reportedUser: { select: { id: true, username: true } },
          _count: { select: { evidence: true, comments: true, appeals: true } },
        },
      }),
      this.prisma.scamCase.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async updateStatus(id: string, actorId: string, dto: AdminStatusDto) {
    const c = await this.prisma.scamCase.findUnique({ where: { id }, select: { id: true, reporterId: true, status: true } });
    if (!c) throw new NotFoundException('Không tìm thấy báo cáo');

    const terminal: ScamCaseStatus[] = ['CONFIRMED', 'RESOLVED', 'CLEARED', 'CLOSED', 'INSUFFICIENT'];
    const updated = await this.prisma.scamCase.update({
      where: { id },
      data: {
        status: dto.status,
        riskLevel: dto.riskLevel ?? undefined,
        modNote: dto.modNote ?? undefined,
        // Tự ẩn báo cáo không đủ căn cứ
        hidden: dto.status === 'INSUFFICIENT' ? true : (dto.status === 'CONFIRMED' || dto.status === 'CLEARED' ? false : undefined),
        resolvedById: terminal.includes(dto.status) ? actorId : null,
        resolvedAt: terminal.includes(dto.status) ? new Date() : null,
      },
      select: { id: true },
    });

    await this.prisma.scamCaseEditLog.create({ data: { caseId: id, editorId: actorId, summary: `[Admin] Đổi trạng thái -> ${dto.status}${dto.riskLevel ? `, rủi ro ${dto.riskLevel}` : ''}` } });

    const labels: Record<string, string> = {
      CONFIRMED: 'Báo cáo đã được XÁC NHẬN là lừa đảo',
      CLEARED: 'Báo cáo đã được gỡ — đối tượng được minh oan',
      RESOLVED: 'Báo cáo đã được giải quyết',
      NEED_EVIDENCE: 'Báo cáo cần bổ sung bằng chứng',
      INSUFFICIENT: 'Báo cáo bị đánh giá không đủ bằng chứng',
      VERIFYING: 'Báo cáo đang được xác minh',
      CLOSED: 'Báo cáo đã đóng',
    };
    if (labels[dto.status]) {
      await this.notifications.notify(c.reporterId, {
        type: 'SYSTEM', title: labels[dto.status], body: dto.modNote || undefined,
        link: `/scam/${id}`, targetType: 'scam_case', targetId: id,
      }).catch(() => {});
      await this.scam.notifyFollowers(id, c.reporterId, { title: labels[dto.status], body: dto.modNote || '' });
    }
    return updated;
  }

  async setHidden(id: string, hidden: boolean, actorId: string) {
    const c = await this.prisma.scamCase.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Không tìm thấy báo cáo');
    await this.prisma.scamCase.update({ where: { id }, data: { hidden } });
    await this.prisma.scamCaseEditLog.create({ data: { caseId: id, editorId: actorId, summary: `[Admin] ${hidden ? 'Ẩn' : 'Hiện'} báo cáo` } });
    return { ok: true };
  }

  async remove(id: string) {
    await this.prisma.scamCase.delete({ where: { id } }).catch(() => { throw new NotFoundException('Không tìm thấy báo cáo'); });
    return { ok: true };
  }

  // ---------- Dashboard thống kê ----------
  async stats() {
    const byStatus = await this.prisma.scamCase.groupBy({ by: ['status'], _count: { _all: true } });
    const byReason = await this.prisma.scamCase.groupBy({ by: ['reason'], _count: { _all: true } });
    const byType = await this.prisma.scamCase.groupBy({ by: ['targetType'], _count: { _all: true } });
    const [total, pendingAppeals, blacklisted, damage] = await Promise.all([
      this.prisma.scamCase.count(),
      this.prisma.scamCaseAppeal.count({ where: { status: 'PENDING' } }),
      this.prisma.scamBlacklist.count(),
      this.prisma.scamCase.aggregate({ where: { status: 'CONFIRMED' }, _sum: { damageValue: true } }),
    ]);
    return {
      total, pendingAppeals, blacklisted, confirmedDamage: damage._sum.damageValue || 0,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
      byReason: Object.fromEntries(byReason.map((s) => [s.reason, s._count._all])),
      byType: Object.fromEntries(byType.map((s) => [s.targetType, s._count._all])),
    };
  }

  // ---------- Khóa tài khoản ----------
  async banUser(userId: string, actorId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    if (u.role === 'ADMIN') throw new BadRequestException('Không thể khóa tài khoản Admin');
    await this.prisma.user.update({ where: { id: userId }, data: { status: 'BANNED' } });
    await this.notifications.notify(userId, { type: 'SYSTEM', title: 'Tài khoản của bạn đã bị khóa', body: 'Do liên quan tới báo cáo lừa đảo đã xác nhận.' }).catch(() => {});
    return { ok: true };
  }

  // ---------- Blacklist (ví/IP/domain/email) ----------
  async addBlacklist(dto: BlacklistDto, actorId: string) {
    return this.prisma.scamBlacklist.upsert({
      where: { kind_value: { kind: dto.kind, value: dto.value } },
      update: { note: dto.note },
      create: { kind: dto.kind, value: dto.value, note: dto.note, createdById: actorId },
    });
  }
  listBlacklist(kind?: string) {
    return this.prisma.scamBlacklist.findMany({
      where: kind ? { kind: kind as any } : {},
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { username: true } } },
    });
  }
  async removeBlacklist(id: string) {
    await this.prisma.scamBlacklist.delete({ where: { id } }).catch(() => { throw new NotFoundException('Không tìm thấy'); });
    return { ok: true };
  }

  // ---------- Khiếu nại ----------
  listAppeals(status?: string) {
    return this.prisma.scamCaseAppeal.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        case: { select: { id: true, title: true, status: true } },
      },
    });
  }
  async resolveAppeal(id: string, action: 'accept' | 'reject', modNote: string | undefined, actorId: string) {
    const a = await this.prisma.scamCaseAppeal.findUnique({ where: { id }, select: { id: true, caseId: true, userId: true } });
    if (!a) throw new NotFoundException('Không tìm thấy khiếu nại');
    const updated = await this.prisma.scamCaseAppeal.update({
      where: { id }, data: { status: action === 'accept' ? 'RESOLVED' : 'DISMISSED', modNote },
    });
    // Chấp nhận khiếu nại => minh oan đối tượng / ẩn báo cáo
    if (action === 'accept') {
      await this.prisma.scamCase.update({ where: { id: a.caseId }, data: { status: 'CLEARED', hidden: false, resolvedById: actorId, resolvedAt: new Date() } });
      await this.prisma.scamCaseEditLog.create({ data: { caseId: a.caseId, editorId: actorId, summary: '[Admin] Chấp nhận khiếu nại — minh oan' } });
    }
    await this.notifications.notify(a.userId, {
      type: 'SYSTEM',
      title: action === 'accept' ? 'Khiếu nại của bạn được chấp nhận' : 'Khiếu nại của bạn bị từ chối',
      body: modNote || undefined, link: `/scam/${a.caseId}`, targetType: 'scam_case', targetId: a.caseId,
    }).catch(() => {});
    return updated;
  }

  // ---------- Cảnh báo toàn hệ thống ----------
  async broadcast(dto: BroadcastDto) {
    const users = await this.prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
    let sent = 0;
    for (const batch of chunk(users, 500)) {
      await this.prisma.notification.createMany({
        data: batch.map((u) => ({ userId: u.id, type: 'SYSTEM' as const, title: dto.title, body: dto.body, link: '/scam' })),
      });
      sent += batch.length;
    }
    return { sent };
  }

  // ---------- Xuất CSV ----------
  async exportCsv(status?: ScamCaseStatus): Promise<string> {
    const rows = await this.prisma.scamCase.findMany({
      where: status ? { status } : {}, orderBy: { createdAt: 'desc' }, take: 5000,
      include: { reporter: { select: { username: true } }, reportedUser: { select: { username: true } } },
    });
    const head = ['id', 'createdAt', 'status', 'riskLevel', 'targetType', 'reason', 'title', 'reporter', 'reportedUser', 'targetName', 'damageValue'];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((r) => [
      r.id, r.createdAt.toISOString(), r.status, r.riskLevel ?? '', r.targetType, r.reason, r.title,
      r.reporter?.username ?? '', r.reportedUser?.username ?? '', r.targetName ?? '', r.damageValue ?? '',
    ].map(esc).join(','));
    return [head.join(','), ...lines].join('\n');
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
