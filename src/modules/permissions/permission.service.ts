import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Danh mục quyền (permission keys) — hiển thị trong lưới phân quyền admin.
export const PERMISSION_CATALOG: { key: string; label: string; group: string }[] = [
  { key: 'forum.startThread', label: 'Tạo chủ đề', group: 'Diễn đàn' },
  { key: 'forum.reply', label: 'Trả lời bài', group: 'Diễn đàn' },
  { key: 'forum.uploadAttachment', label: 'Đính kèm tệp', group: 'Diễn đàn' },
  { key: 'forum.createPoll', label: 'Tạo bình chọn', group: 'Diễn đàn' },
  { key: 'forum.postHiddenContent', label: 'Đăng nội dung ẩn', group: 'Diễn đàn' },
  { key: 'forum.tipDonate', label: 'Donate/tip', group: 'Diễn đàn' },
  { key: 'ai.useWriting', label: 'Dùng công cụ AI', group: 'AI' },
  { key: 'marketplace.sell', label: 'Bán hàng ở chợ', group: 'Chợ' },
  { key: 'mod.deletePost', label: 'Xoá bài (mod)', group: 'Kiểm duyệt' },
  { key: 'mod.lockThread', label: 'Khoá/ghim chủ đề (mod)', group: 'Kiểm duyệt' },
  { key: 'mod.approveContent', label: 'Duyệt nội dung (mod)', group: 'Kiểm duyệt' },
  { key: 'admin.access', label: 'Truy cập quản trị', group: 'Quản trị' },
];
export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => p.key);

// Bộ quyền mặc định cho các nhóm hệ thống (map theo role).
export const DEFAULT_GROUPS: { key: string; name: string; color: string; priority: number; permissions: string[] }[] = [
  { key: 'guest', name: 'Khách', color: 'gray', priority: 0, permissions: [] },
  { key: 'member', name: 'Thành viên', color: 'gray', priority: 10, permissions: ['forum.startThread', 'forum.reply', 'forum.uploadAttachment', 'forum.createPoll', 'forum.postHiddenContent', 'forum.tipDonate', 'ai.useWriting'] },
  { key: 'vip', name: 'VIP', color: 'amber', priority: 20, permissions: ['forum.startThread', 'forum.reply', 'forum.uploadAttachment', 'forum.createPoll', 'forum.postHiddenContent', 'forum.tipDonate', 'ai.useWriting', 'marketplace.sell'] },
  { key: 'moderator', name: 'Điều hành viên', color: 'violet', priority: 50, permissions: ['forum.startThread', 'forum.reply', 'forum.uploadAttachment', 'forum.createPoll', 'forum.postHiddenContent', 'forum.tipDonate', 'ai.useWriting', 'marketplace.sell', 'mod.deletePost', 'mod.lockThread', 'mod.approveContent'] },
  { key: 'admin', name: 'Quản trị viên', color: 'red', priority: 100, permissions: ['*'] },
];

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Quyền hiệu lực của user = nhóm mặc định theo role + các nhóm phụ. ADMIN = tất cả. */
  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, groupMemberships: { select: { group: { select: { permissions: true } } } } },
    });
    if (!user) return [];
    if (user.role === 'ADMIN') return ['*'];

    const set = new Set<string>();
    // nhóm mặc định theo role
    const roleKey = user.role.toLowerCase();
    const defaultGroup = await this.prisma.userGroup.findUnique({ where: { key: roleKey }, select: { permissions: true } }).catch(() => null);
    (defaultGroup?.permissions || []).forEach((p) => set.add(p));
    // nhóm phụ
    for (const m of user.groupMemberships) (m.group.permissions || []).forEach((p) => set.add(p));

    if (set.has('*')) return ['*'];
    return [...set];
  }

  async can(userId: string, permission: string): Promise<boolean> {
    const perms = await this.getUserPermissions(userId);
    return perms.includes('*') || perms.includes(permission);
  }

  /** Tự thăng nhóm: gán user vào các nhóm autoPromote khi đạt cột mốc. Gọi lúc đăng nhập / lazy. */
  async applyAutoPromotions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { postCount: true, reputationScore: true, createdAt: true, groupMemberships: { select: { groupId: true } } },
    });
    if (!user) return [];
    const groups = await this.prisma.userGroup.findMany({ where: { autoPromote: true } });
    if (!groups.length) return [];
    const ageDays = Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000);
    const already = new Set(user.groupMemberships.map((m) => m.groupId));
    const assigned: string[] = [];
    for (const g of groups) {
      if (already.has(g.id)) continue;
      if (user.postCount >= g.minPosts && user.reputationScore >= g.minReputation && ageDays >= g.minDays) {
        await this.prisma.userGroupMember.create({ data: { userId, groupId: g.id } }).catch(() => {});
        assigned.push(g.name);
      }
    }
    return assigned;
  }

  // ── Admin ──
  listCatalog() { return { catalog: PERMISSION_CATALOG }; }

  async listGroups() {
    return this.prisma.userGroup.findMany({
      orderBy: { priority: 'asc' },
      include: { _count: { select: { members: true } } },
    });
  }

  async createGroup(dto: any) {
    const key = (dto.key?.trim() || dto.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')).slice(0, 40);
    return this.prisma.userGroup.create({
      data: {
        key, name: dto.name.trim(), color: dto.color, badgeIcon: dto.badgeIcon, priority: dto.priority ?? 30, isSystem: false, permissions: dto.permissions || [],
        autoPromote: !!dto.autoPromote, minPosts: Number(dto.minPosts) || 0, minReputation: Number(dto.minReputation) || 0, minDays: Number(dto.minDays) || 0,
      },
    });
  }

  async updateGroup(id: string, dto: any) {
    return this.prisma.userGroup.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
        ...(dto.badgeIcon !== undefined ? { badgeIcon: dto.badgeIcon } : {}),
        ...(dto.priority !== undefined ? { priority: Number(dto.priority) } : {}),
        ...(dto.permissions !== undefined ? { permissions: dto.permissions } : {}),
        ...(dto.autoPromote !== undefined ? { autoPromote: !!dto.autoPromote } : {}),
        ...(dto.minPosts !== undefined ? { minPosts: Number(dto.minPosts) || 0 } : {}),
        ...(dto.minReputation !== undefined ? { minReputation: Number(dto.minReputation) || 0 } : {}),
        ...(dto.minDays !== undefined ? { minDays: Number(dto.minDays) || 0 } : {}),
      },
    });
  }

  async deleteGroup(id: string) {
    const g = await this.prisma.userGroup.findUnique({ where: { id } });
    if (g?.isSystem) throw new Error('Không thể xoá nhóm hệ thống');
    await this.prisma.userGroup.delete({ where: { id } });
    return { ok: true };
  }

  async assignUser(userId: string, groupId: string) {
    await this.prisma.userGroupMember.upsert({
      where: { userId_groupId: { userId, groupId } },
      update: {},
      create: { userId, groupId },
    });
    return { ok: true };
  }
  async unassignUser(userId: string, groupId: string) {
    await this.prisma.userGroupMember.deleteMany({ where: { userId, groupId } });
    return { ok: true };
  }
  async userGroups(userId: string) {
    const rows = await this.prisma.userGroupMember.findMany({ where: { userId }, include: { group: true } });
    return rows.map((r) => r.group);
  }
}
