import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus, ReportStatus } from '@prisma/client';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // DASHBOARD STATS
  // ──────────────────────────────────────────────
  async getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 86400000);

    const [
      totalUsers, newUsersToday, totalThreads, totalPosts,
      totalProducts, pendingReports, totalGemCirculation,
      newUsersWeek, activeToday,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.thread.count(),
      this.prisma.post.count({ where: { isDeleted: false } }),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.gemWallet.aggregate({ _sum: { balance: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: today } } }),
    ]);

    return {
      users: { total: totalUsers, newToday: newUsersToday, newWeek: newUsersWeek, activeToday },
      forum: { threads: totalThreads, posts: totalPosts },
      marketplace: { products: totalProducts },
      moderation: { pendingReports },
      gem: { circulation: totalGemCirculation._sum.balance ?? 0 },
    };
  }

  // Biểu đồ user đăng ký 30 ngày
  async getUserGrowth(days = 30) {
    const since = new Date(Date.now() - days * 86400000);
    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });

    const buckets: Record<string, number> = {};
    for (const u of users) {
      const key = u.createdAt.toISOString().slice(0, 10);
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
    return Object.entries(buckets)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ──────────────────────────────────────────────
  // USER MANAGEMENT
  // ──────────────────────────────────────────────
  async listUsers(query: {
    search?: string;
    role?: UserRole;
    status?: UserStatus;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const where: any = {};
    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role;
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, username: true, email: true, displayName: true, avatar: true,
          role: true, status: true, gemBalance: true, postCount: true,
          reputationScore: true, createdAt: true, lastSeenAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async updateUserRole(userId: string, role: UserRole, actorId: string) {
    const before = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const user = await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.audit(actorId, 'user.role_change', 'user', userId, before, { role });
    return user;
  }

  async banUser(userId: string, reason: string, until: Date | null, actorId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'BANNED', banReason: reason, bannedUntil: until },
    });
    await this.audit(actorId, 'user.ban', 'user', userId, null, { reason, until });
    return user;
  }

  async unbanUser(userId: string, actorId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE', banReason: null, bannedUntil: null },
    });
    await this.audit(actorId, 'user.unban', 'user', userId, null, null);
    return user;
  }

  async adjustGem(userId: string, amount: number, note: string, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { gemBalance: true } });
      if (!user) throw new NotFoundException('User không tồn tại');
      const balanceAfter = user.gemBalance + amount;
      if (balanceAfter < 0) throw new BadRequestException('Số dư không thể âm');

      await tx.user.update({ where: { id: userId }, data: { gemBalance: balanceAfter } });
      await tx.gemTransaction.create({
        data: {
          userId, type: 'ADMIN_ADJUST', amount,
          balanceBefore: user.gemBalance, balanceAfter,
          note: note ?? 'Điều chỉnh bởi admin',
        },
      });
      await this.audit(actorId, 'user.gem_adjust', 'user', userId, null, { amount, note });
      return { balanceAfter };
    });
  }

  // ──────────────────────────────────────────────
  // MODERATION QUEUE
  // ──────────────────────────────────────────────
  async getReports(status: ReportStatus = 'PENDING', page = 1, limit = 25) {
    const [data, total] = await Promise.all([
      this.prisma.report.findMany({
        where: { status },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: { select: { id: true, username: true } },
          reportedUser: { select: { id: true, username: true } },
        },
      }),
      this.prisma.report.count({ where: { status } }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async resolveReport(reportId: string, action: 'resolve' | 'dismiss', modNote: string, actorId: string) {
    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: action === 'resolve' ? 'RESOLVED' : 'DISMISSED',
        modNote,
        resolvedById: actorId,
        resolvedAt: new Date(),
      },
    });
    await this.audit(actorId, `report.${action}`, 'report', reportId, null, { modNote });
    return report;
  }

  // ──────────────────────────────────────────────
  // AUDIT LOG VIEWER
  // ──────────────────────────────────────────────
  async getAuditLogs(page = 1, limit = 50, action?: string) {
    const where = action ? { action } : {};
    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data, meta: { total, page, limit } };
  }

  private async audit(actorId: string, action: string, targetType: string, targetId: string, before: any, after: any) {
    await this.prisma.auditLog.create({
      data: { actorId, action, targetType, targetId, before, after },
    });
  }
}
