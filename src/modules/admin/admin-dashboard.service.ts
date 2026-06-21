import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
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
      pendingReports, totalGemCirculation,
      newUsersWeek, activeToday,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: today } } }),
      this.prisma.thread.count(),
      this.prisma.post.count({ where: { isDeleted: false } }),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.gemWallet.aggregate({ _sum: { balance: true } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: today } } }),
    ]);

    return {
      users: { total: totalUsers, newToday: newUsersToday, newWeek: newUsersWeek, activeToday },
      forum: { threads: totalThreads, posts: totalPosts },
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
          gameCharacter: { select: { coinBalance: true } },
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

  /** Spam cleaner: ban user + xoá mềm toàn bộ bài/chủ đề/profile post của họ. */
  async spamClean(userId: string, reason: string, actorId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!target) throw new Error('User không tồn tại');
    if (target.role === 'ADMIN') throw new Error('Không thể dọn spam tài khoản admin');

    const [posts, threads, profilePosts] = await this.prisma.$transaction([
      this.prisma.post.updateMany({ where: { authorId: userId, isDeleted: false }, data: { isDeleted: true, deletedAt: new Date(), deletedById: actorId } }),
      this.prisma.thread.updateMany({ where: { authorId: userId }, data: { isApproved: false, status: 'ARCHIVED' } }),
      this.prisma.profilePost.deleteMany({ where: { authorId: userId } }),
      this.prisma.user.update({ where: { id: userId }, data: { status: 'BANNED', banReason: reason || 'Spam', bannedUntil: null } }),
    ]);
    await this.audit(actorId, 'user.spam_clean', 'user', userId, null, { reason, posts: posts.count, threads: threads.count, profilePosts: profilePosts.count });
    return { ok: true, postsDeleted: posts.count, threadsArchived: threads.count, profilePostsDeleted: profilePosts.count };
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

  // Điều chỉnh xu (coin game) trên nhân vật
  async adjustCoin(userId: string, amount: number, note: string, actorId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId }, select: { id: true, coinBalance: true } });
    if (!char) throw new NotFoundException('User chưa có nhân vật game');
    const balanceAfter = char.coinBalance + amount;
    if (balanceAfter < 0) throw new BadRequestException('Số dư xu không thể âm');
    await this.prisma.gameCharacter.update({ where: { id: char.id }, data: { coinBalance: balanceAfter } });
    await this.audit(actorId, 'user.coin_adjust', 'user', userId, null, { amount, note });
    return { balanceAfter };
  }

  // Sửa thông tin user (tên hiển thị / email)
  async updateUserInfo(userId: string, data: { displayName?: string; email?: string }, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true } });
    if (!user) throw new NotFoundException('User không tồn tại');
    const patch: any = {};
    if (data.displayName !== undefined) patch.displayName = data.displayName?.trim() || null;
    if (data.email !== undefined && data.email.trim()) {
      const exist = await this.prisma.user.findFirst({ where: { email: data.email.trim(), id: { not: userId } }, select: { id: true } });
      if (exist) throw new BadRequestException('Email đã được dùng bởi tài khoản khác');
      patch.email = data.email.trim();
    }
    await this.prisma.user.update({ where: { id: userId }, data: patch });
    await this.audit(actorId, 'user.update_info', 'user', userId, user, patch);
    return { ok: true };
  }

  // Đặt lại mật khẩu
  async resetPassword(userId: string, newPassword: string, actorId: string) {
    if (!newPassword || newPassword.length < 6) throw new BadRequestException('Mật khẩu tối thiểu 6 ký tự');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('User không tồn tại');
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(newPassword) } });
    await this.audit(actorId, 'user.reset_password', 'user', userId, null, {});
    return { ok: true };
  }

  // Xoá user (cascade qua quan hệ onDelete: Cascade)
  async deleteUser(userId: string, actorId: string) {
    if (userId === actorId) throw new BadRequestException('Không thể tự xoá chính mình');
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { username: true, role: true } });
    if (!user) throw new NotFoundException('User không tồn tại');
    if (user.role === 'ADMIN') throw new BadRequestException('Không thể xoá tài khoản ADMIN');
    await this.audit(actorId, 'user.delete', 'user', userId, user, null);
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
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
