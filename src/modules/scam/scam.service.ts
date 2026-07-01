import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ScamCaseStatus, ScamReason, ScamRiskLevel, ScamVoteKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppealDto, CommentDto, CreateScamCaseDto, UpdateScamCaseDto } from './scam.dto';

// Lý do mang tính giao dịch => bắt buộc có bằng chứng giao dịch (chống vu khống)
const TRANSACTIONAL: ScamReason[] = ['NO_DELIVERY', 'NO_PAYMENT', 'CHARGEBACK', 'FAKE_GOODS'];
// Trạng thái hiển thị công khai (loại bỏ rác / đã đóng / minh oan)
const PUBLIC_STATUSES: ScamCaseStatus[] = ['PENDING', 'VERIFYING', 'NEED_EVIDENCE', 'CONFIRMED', 'RESOLVED'];
// Khi báo cáo đã chốt (xác nhận/giải quyết/minh oan) thì người tạo không được tự sửa
const LOCKED_FOR_EDIT: ScamCaseStatus[] = ['CONFIRMED', 'RESOLVED', 'CLEARED', 'CLOSED'];

const IDENTIFIER_FIELDS = [
  'targetUid', 'targetEmail', 'targetPhone', 'targetWallet', 'targetDomain',
  'targetDiscord', 'targetTelegram', 'targetFacebook', 'targetZalo', 'targetName',
] as const;

@Injectable()
export class ScamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------- Ẩn thông tin nhạy cảm ----------
  private maskEmail(v?: string | null) {
    if (!v) return v ?? null;
    const [u, d] = v.split('@');
    if (!d) return v[0] + '***';
    return `${u.slice(0, 2)}***@${d}`;
  }
  private maskPhone(v?: string | null) {
    if (!v) return v ?? null;
    return v.length <= 4 ? '***' : `${'*'.repeat(v.length - 3)}${v.slice(-3)}`;
  }
  private maskWallet(v?: string | null) {
    if (!v) return v ?? null;
    return v.length <= 12 ? v : `${v.slice(0, 6)}…${v.slice(-4)}`;
  }
  private maskCase<T extends Record<string, any>>(c: T): T {
    if (!c) return c;
    return {
      ...c,
      targetEmail: this.maskEmail(c.targetEmail),
      targetPhone: this.maskPhone(c.targetPhone),
      targetWallet: this.maskWallet(c.targetWallet),
    };
  }

  private listSelect(): Prisma.ScamCaseSelect {
    return {
      id: true, targetType: true, reason: true, status: true, riskLevel: true,
      reportedUserId: true, targetName: true, targetUid: true, targetEmail: true,
      targetPhone: true, targetWallet: true, targetDomain: true, targetDiscord: true,
      targetTelegram: true, targetFacebook: true, targetZalo: true,
      title: true, damageValue: true, incidentDate: true,
      helpfulCount: true, meTooCount: true, followerCount: true, commentCount: true, viewCount: true,
      createdAt: true,
      reporter: { select: { id: true, username: true, displayName: true, avatar: true } },
      reportedUser: { select: { id: true, username: true, displayName: true, avatar: true } },
    };
  }

  // ---------- Tạo báo cáo ----------
  async create(reporterId: string, dto: CreateScamCaseDto) {
    if (!dto.evidence?.length) throw new BadRequestException('Bắt buộc cung cấp ít nhất 1 bằng chứng');
    if (dto.reportedUserId === reporterId) throw new BadRequestException('Không thể tự tố cáo chính mình');

    // Chống vu khống: lý do giao dịch phải kèm bằng chứng giao dịch / mã đơn
    if (TRANSACTIONAL.includes(dto.reason)) {
      const hasProof = !!dto.orderRef ||
        dto.evidence.some((e) => ['INVOICE', 'CRYPTO_TX', 'CHAT_SCREENSHOT', 'SYSTEM_MSG'].includes(e.kind));
      if (!hasProof) {
        throw new BadRequestException('Lý do liên quan giao dịch cần mã đơn hàng hoặc bằng chứng giao dịch (hóa đơn/hash/ảnh chat)');
      }
    }

    // Có ít nhất 1 cách định danh đối tượng
    const hasTarget = !!dto.reportedUserId || IDENTIFIER_FIELDS.some((f) => (dto as any)[f]);
    if (!hasTarget) throw new BadRequestException('Phải cung cấp ít nhất 1 thông tin định danh đối tượng');

    if (dto.reportedUserId) {
      const exists = await this.prisma.user.findUnique({ where: { id: dto.reportedUserId }, select: { id: true } });
      if (!exists) throw new NotFoundException('Người bị tố cáo không tồn tại');
    }

    const created = await this.prisma.scamCase.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        reason: dto.reason,
        reportedUserId: dto.reportedUserId || null,
        targetName: dto.targetName, targetUid: dto.targetUid, targetEmail: dto.targetEmail,
        targetPhone: dto.targetPhone, targetBankAccount: dto.targetBankAccount, targetBank: dto.targetBank,
        targetWallet: dto.targetWallet, targetDomain: dto.targetDomain,
        targetDiscord: dto.targetDiscord, targetTelegram: dto.targetTelegram,
        targetFacebook: dto.targetFacebook, targetZalo: dto.targetZalo,
        title: dto.title, description: dto.description,
        damageValue: dto.damageValue ?? null,
        incidentDate: dto.incidentDate ? new Date(dto.incidentDate) : null,
        orderRef: dto.orderRef,
        evidence: { create: dto.evidence.map((e) => ({ kind: e.kind, url: e.url, label: e.label })) },
      },
      select: { id: true },
    });

    // Cho bên bị tố cáo biết để phản hồi
    if (dto.reportedUserId) {
      await this.notifications.notify(dto.reportedUserId, {
        type: 'SYSTEM',
        title: 'Bạn bị nhắc đến trong một báo cáo tố cáo',
        body: 'Bạn có quyền phản hồi để bảo vệ mình.',
        link: `/scam/${created.id}`,
        targetType: 'scam_case', targetId: created.id,
      }).catch(() => {});
    }
    return { id: created.id };
  }

  // ---------- Danh sách công khai ----------
  async list(params: { status?: ScamCaseStatus; targetType?: string; reason?: string; q?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(params.limit) || 20));
    const where: Prisma.ScamCaseWhereInput = {
      hidden: false,
      status: params.status ? params.status : { in: PUBLIC_STATUSES },
      ...(params.targetType ? { targetType: params.targetType as any } : {}),
      ...(params.reason ? { reason: params.reason as any } : {}),
      ...(params.q ? { OR: this.searchOr(params.q) } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.scamCase.findMany({ where, select: this.listSelect(), orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.scamCase.count({ where }),
    ]);
    return { data: rows.map((r) => this.maskCase(r)), meta: { total, page, limit } };
  }

  private searchOr(q: string): Prisma.ScamCaseWhereInput[] {
    const c: Prisma.QueryMode = 'insensitive';
    return [
      { title: { contains: q, mode: c } },
      { targetName: { contains: q, mode: c } },
      { targetUid: { contains: q, mode: c } },
      { targetEmail: { contains: q, mode: c } },
      { targetPhone: { contains: q, mode: c } },
      { targetWallet: { contains: q, mode: c } },
      { targetDomain: { contains: q, mode: c } },
      { targetDiscord: { contains: q, mode: c } },
      { targetTelegram: { contains: q, mode: c } },
      { targetFacebook: { contains: q, mode: c } },
      { targetZalo: { contains: q, mode: c } },
      { reportedUser: { username: { contains: q, mode: c } } },
    ];
  }

  // ---------- Chi tiết ----------
  async detail(id: string, userId?: string) {
    const c = await this.prisma.scamCase.findUnique({
      where: { id },
      include: {
        reporter: { select: { id: true, username: true, displayName: true, avatar: true } },
        reportedUser: { select: { id: true, username: true, displayName: true, avatar: true, createdAt: true } },
        evidence: { orderBy: { createdAt: 'asc' } },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, username: true, displayName: true, avatar: true, role: true } } },
        },
        appeals: { select: { id: true, status: true, reason: true, createdAt: true, userId: true } },
        editLogs: { orderBy: { createdAt: 'desc' }, include: { editor: { select: { username: true } } } },
        _count: { select: { follows: true } },
      },
    });
    if (!c || c.hidden) {
      // chủ báo cáo / admin vẫn xem được bản ẩn
      if (!c) throw new NotFoundException('Không tìm thấy báo cáo');
      if (c.hidden && c.reporterId !== userId) throw new NotFoundException('Không tìm thấy báo cáo');
    }
    await this.prisma.scamCase.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});

    let myVotes: ScamVoteKind[] = [];
    let following = false;
    if (userId) {
      const [votes, follow] = await Promise.all([
        this.prisma.scamCaseVote.findMany({ where: { caseId: id, userId }, select: { kind: true } }),
        this.prisma.scamCaseFollow.findFirst({ where: { caseId: id, userId }, select: { id: true } }),
      ]);
      myVotes = votes.map((v) => v.kind);
      following = !!follow;
    }
    const canDefend = !!userId && c.reportedUserId === userId;
    return { ...this.maskCase(c), myVotes, following, canDefend, isOwner: userId === c.reporterId };
  }

  // ---------- Tìm kiếm scammer ----------
  async search(q: string) {
    if (!q || q.trim().length < 2) return { cases: [], profile: null };
    const where: Prisma.ScamCaseWhereInput = { hidden: false, OR: this.searchOr(q) };
    const cases = await this.prisma.scamCase.findMany({ where, select: this.listSelect(), orderBy: { createdAt: 'desc' }, take: 30 });
    // Tổng hợp hồ sơ nếu có 1 đối tượng nổi bật (theo user hoặc ví/domain)
    let profile: any = null;
    const byUser = cases.find((c) => c.reportedUserId);
    if (byUser?.reportedUserId) profile = await this.scammerProfile({ userId: byUser.reportedUserId });
    return { cases: cases.map((c) => this.maskCase(c)), profile };
  }

  // ---------- Hồ sơ scammer (tổng hợp) ----------
  async scammerProfile(params: { userId?: string; wallet?: string; domain?: string }) {
    const base: Prisma.ScamCaseWhereInput = params.userId
      ? { reportedUserId: params.userId }
      : params.wallet ? { targetWallet: params.wallet }
      : params.domain ? { targetDomain: params.domain }
      : {};
    if (!Object.keys(base).length) return null;

    const cases = await this.prisma.scamCase.findMany({
      where: { ...base, hidden: false },
      select: { id: true, status: true, riskLevel: true, reporterId: true, damageValue: true, title: true, reason: true, createdAt: true, targetName: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!cases.length) return null;

    const confirmed = cases.filter((c) => c.status === 'CONFIRMED');
    const victims = new Set(cases.map((c) => c.reporterId)).size;
    const totalDamage = cases.reduce((s, c) => s + (c.damageValue || 0), 0);
    const risk = this.computeRisk(confirmed.length, totalDamage, cases.length);

    let user: any = null;
    if (params.userId) {
      user = await this.prisma.user.findUnique({
        where: { id: params.userId },
        select: { id: true, username: true, displayName: true, avatar: true, createdAt: true },
      });
    }
    return {
      user, identifier: params.wallet || params.domain || params.userId,
      label: cases[0].targetName,
      reportCount: cases.length, confirmedCount: confirmed.length,
      victimCount: victims, totalDamage, riskLevel: risk,
      relatedCases: cases.slice(0, 20),
    };
  }

  private computeRisk(confirmed: number, damage: number, total: number): ScamRiskLevel {
    if (confirmed >= 5 || damage >= 50_000_000) return 'CRITICAL';
    if (confirmed >= 2 || damage >= 10_000_000) return 'HIGH';
    if (confirmed >= 1 || total >= 3) return 'MEDIUM';
    return 'LOW';
  }

  // ---------- Trang công khai ----------
  async topScammers(limit = 20) {
    const grouped = await this.prisma.scamCase.groupBy({
      by: ['reportedUserId'],
      where: { status: 'CONFIRMED', hidden: false, reportedUserId: { not: null } },
      _count: { _all: true }, _sum: { damageValue: true },
      orderBy: { _count: { reportedUserId: 'desc' } },
      take: limit,
    });
    const ids = grouped.map((g) => g.reportedUserId!).filter(Boolean);
    const users = await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, username: true, displayName: true, avatar: true } });
    const map = new Map(users.map((u) => [u.id, u]));
    return grouped.map((g) => ({
      user: map.get(g.reportedUserId!) || null,
      reportCount: g._count._all,
      totalDamage: g._sum.damageValue || 0,
      riskLevel: this.computeRisk(g._count._all, g._sum.damageValue || 0, g._count._all),
    }));
  }

  async recentWarnings(limit = 12) {
    const rows = await this.prisma.scamCase.findMany({
      where: { hidden: false, status: { in: ['VERIFYING', 'CONFIRMED'] } },
      select: this.listSelect(), orderBy: { createdAt: 'desc' }, take: limit,
    });
    return rows.map((r) => this.maskCase(r));
  }

  async clearedList(limit = 20) {
    const rows = await this.prisma.scamCase.findMany({
      where: { status: 'CLEARED' }, select: this.listSelect(), orderBy: { resolvedAt: 'desc' }, take: limit,
    });
    return rows.map((r) => this.maskCase(r));
  }

  async publicStats() {
    const [total, confirmed, cleared, agg] = await Promise.all([
      this.prisma.scamCase.count({ where: { hidden: false } }),
      this.prisma.scamCase.count({ where: { status: 'CONFIRMED' } }),
      this.prisma.scamCase.count({ where: { status: 'CLEARED' } }),
      this.prisma.scamCase.aggregate({ where: { status: 'CONFIRMED' }, _sum: { damageValue: true } }),
    ]);
    const victims = await this.prisma.scamCase.findMany({ where: { status: 'CONFIRMED' }, select: { reporterId: true } });
    return {
      totalReports: total, confirmedScams: confirmed, clearedReports: cleared,
      totalDamage: agg._sum.damageValue || 0,
      victims: new Set(victims.map((v) => v.reporterId)).size,
    };
  }

  guide() {
    return [
      { title: 'Kiểm tra uy tín trước khi giao dịch', body: 'Tra cứu UID/ví/website của đối tượng trong hệ thống tố cáo. Ưu tiên người có lịch sử giao dịch, đánh giá tốt.' },
      { title: 'Dùng trung gian (escrow)', body: 'Với giao dịch giá trị cao, hãy dùng dịch vụ trung gian uy tín thay vì chuyển khoản trực tiếp.' },
      { title: 'Lưu lại bằng chứng', body: 'Chụp màn hình toàn bộ hội thoại, hoá đơn, hash giao dịch crypto. Đây là căn cứ bắt buộc khi tố cáo.' },
      { title: 'Cảnh giác với giá quá hời', body: 'Khuyến mãi/giảm giá phi lý, hối thúc chuyển tiền gấp là dấu hiệu lừa đảo phổ biến.' },
      { title: 'Không chia sẻ OTP / mật khẩu', body: 'Không ai cần OTP của bạn để giao dịch hợp lệ. Cẩn thận với mạo danh admin/sàn.' },
      { title: 'Báo cáo ngay khi bị lừa', body: 'Tố cáo sớm giúp cảnh báo cộng đồng và tăng khả năng truy vết dòng tiền.' },
    ];
  }

  // ---------- Sửa báo cáo (chủ sở hữu) ----------
  async update(id: string, userId: string, dto: UpdateScamCaseDto) {
    const c = await this.prisma.scamCase.findUnique({ where: { id }, select: { reporterId: true, status: true } });
    if (!c) throw new NotFoundException('Không tìm thấy báo cáo');
    if (c.reporterId !== userId) throw new ForbiddenException('Chỉ người tạo mới được sửa');
    if (LOCKED_FOR_EDIT.includes(c.status)) throw new BadRequestException('Báo cáo đã chốt, không thể sửa');

    const changes: string[] = [];
    if (dto.title !== undefined) changes.push('tiêu đề');
    if (dto.description !== undefined) changes.push('mô tả');
    if (dto.damageValue !== undefined) changes.push('thiệt hại');
    if (dto.orderRef !== undefined) changes.push('mã đơn');
    if (dto.evidence) changes.push('bằng chứng');

    await this.prisma.$transaction(async (tx) => {
      await tx.scamCase.update({
        where: { id },
        data: {
          title: dto.title, description: dto.description,
          damageValue: dto.damageValue, orderRef: dto.orderRef,
        },
      });
      if (dto.evidence) {
        await tx.scamCaseEvidence.deleteMany({ where: { caseId: id } });
        await tx.scamCaseEvidence.createMany({ data: dto.evidence.map((e) => ({ caseId: id, kind: e.kind, url: e.url, label: e.label })) });
      }
      await tx.scamCaseEditLog.create({ data: { caseId: id, editorId: userId, summary: `Cập nhật: ${changes.join(', ') || 'không có thay đổi'}` } });
    });
    return { ok: true };
  }

  async mine(userId: string) {
    return this.prisma.scamCase.findMany({
      where: { reporterId: userId }, select: { ...this.listSelect(), status: true, hidden: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------- Cộng đồng ----------
  async comment(id: string, userId: string, dto: CommentDto) {
    const c = await this.prisma.scamCase.findUnique({ where: { id }, select: { id: true, reporterId: true, reportedUserId: true } });
    if (!c) throw new NotFoundException('Không tìm thấy báo cáo');
    const isDefense = c.reportedUserId === userId;
    const [created] = await this.prisma.$transaction([
      this.prisma.scamCaseComment.create({
        data: { caseId: id, authorId: userId, body: dto.body, isDefense },
        include: { author: { select: { id: true, username: true, displayName: true, avatar: true, role: true } } },
      }),
      this.prisma.scamCase.update({ where: { id }, data: { commentCount: { increment: 1 } } }),
    ]);
    await this.notifyFollowers(id, userId, {
      title: isDefense ? 'Bên bị tố cáo đã phản hồi' : 'Bình luận mới trong báo cáo bạn theo dõi',
      body: dto.body.slice(0, 120),
    });
    return created;
  }

  async vote(id: string, userId: string, kind: ScamVoteKind) {
    const c = await this.prisma.scamCase.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Không tìm thấy báo cáo');
    const field = kind === 'HELPFUL' ? 'helpfulCount' : 'meTooCount';
    const existing = await this.prisma.scamCaseVote.findUnique({ where: { caseId_userId_kind: { caseId: id, userId, kind } } });
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.scamCaseVote.delete({ where: { id: existing.id } }),
        this.prisma.scamCase.update({ where: { id }, data: { [field]: { decrement: 1 } } }),
      ]);
      return { active: false };
    }
    await this.prisma.$transaction([
      this.prisma.scamCaseVote.create({ data: { caseId: id, userId, kind } }),
      this.prisma.scamCase.update({ where: { id }, data: { [field]: { increment: 1 } } }),
    ]);
    return { active: true };
  }

  async follow(id: string, userId: string) {
    const c = await this.prisma.scamCase.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Không tìm thấy báo cáo');
    const existing = await this.prisma.scamCaseFollow.findUnique({ where: { caseId_userId: { caseId: id, userId } } });
    if (existing) {
      await this.prisma.$transaction([
        this.prisma.scamCaseFollow.delete({ where: { id: existing.id } }),
        this.prisma.scamCase.update({ where: { id }, data: { followerCount: { decrement: 1 } } }),
      ]);
      return { following: false };
    }
    await this.prisma.$transaction([
      this.prisma.scamCaseFollow.create({ data: { caseId: id, userId } }),
      this.prisma.scamCase.update({ where: { id }, data: { followerCount: { increment: 1 } } }),
    ]);
    return { following: true };
  }

  async appeal(id: string, userId: string, dto: AppealDto) {
    const c = await this.prisma.scamCase.findUnique({ where: { id }, select: { id: true } });
    if (!c) throw new NotFoundException('Không tìm thấy báo cáo');
    const dup = await this.prisma.scamCaseAppeal.findFirst({ where: { caseId: id, userId, status: 'PENDING' } });
    if (dup) throw new BadRequestException('Bạn đã gửi khiếu nại và đang chờ xử lý');
    return this.prisma.scamCaseAppeal.create({ data: { caseId: id, userId, reason: dto.reason } });
  }

  async notifyFollowers(caseId: string, exceptUserId: string, payload: { title: string; body: string }) {
    const follows = await this.prisma.scamCaseFollow.findMany({ where: { caseId, userId: { not: exceptUserId } }, select: { userId: true } });
    await Promise.all(follows.map((f) => this.notifications.notify(f.userId, {
      type: 'SYSTEM', title: payload.title, body: payload.body,
      link: `/scam/${caseId}`, targetType: 'scam_case', targetId: caseId,
    }).catch(() => {})));
  }
}
