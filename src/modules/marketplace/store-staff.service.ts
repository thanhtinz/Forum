import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PERMS = ['products', 'orders', 'tickets', 'coupons', 'stock'];

@Injectable()
export class StoreStaffService {
  constructor(private readonly prisma: PrismaService) {}

  private async store(userId: string) {
    const s = await this.prisma.storefront.findUnique({ where: { ownerId: userId } });
    if (!s) throw new BadRequestException('Bạn chưa có gian hàng');
    return s;
  }

  // ── Nhân viên ──
  async listStaff(userId: string) {
    const s = await this.store(userId);
    const staff = await this.prisma.storeStaff.findMany({ where: { storefrontId: s.id }, orderBy: { createdAt: 'desc' } });
    // kèm username
    const users = await this.prisma.user.findMany({ where: { id: { in: staff.map((x) => x.userId) } }, select: { id: true, username: true, displayName: true } });
    const map = new Map(users.map((u) => [u.id, u]));
    return staff.map((x) => ({ ...x, user: map.get(x.userId) }));
  }

  async addStaff(userId: string, username: string, role: string, permissions: string[]) {
    const s = await this.store(userId);
    const u = await this.prisma.user.findUnique({ where: { username }, select: { id: true } });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    if (u.id === userId) throw new BadRequestException('Bạn là chủ shop');
    const perms = (permissions || []).filter((p) => PERMS.includes(p));
    const staff = await this.prisma.storeStaff.upsert({
      where: { storefrontId_userId: { storefrontId: s.id, userId: u.id } },
      update: { role, permissions: perms },
      create: { storefrontId: s.id, userId: u.id, role, permissions: perms },
    });
    await this.log(s.id, userId, 'staff.add', `Thêm nhân viên ${username}`);
    return staff;
  }

  async removeStaff(userId: string, staffId: string) {
    const s = await this.store(userId);
    await this.prisma.storeStaff.deleteMany({ where: { id: staffId, storefrontId: s.id } });
    await this.log(s.id, userId, 'staff.remove', 'Xóa nhân viên');
    return { ok: true };
  }

  // ── Nhật ký hoạt động ──
  async activity(userId: string, page = 1, limit = 50) {
    const s = await this.store(userId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.storeActivityLog.findMany({ where: { storefrontId: s.id }, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.storeActivityLog.count({ where: { storefrontId: s.id } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // Helper ghi log (dùng bởi các service seller khác)
  async log(storefrontId: string, actorId: string, action: string, detail?: string) {
    try { await this.prisma.storeActivityLog.create({ data: { storefrontId, actorId, action, detail } }); } catch { /* */ }
  }

  // Trả về storefront mà user là CHỦ hoặc NHÂN VIÊN có quyền `perm`
  async resolveStore(userId: string, perm: string): Promise<{ id: string }> {
    const owned = await this.prisma.storefront.findUnique({ where: { ownerId: userId }, select: { id: true } });
    if (owned) return owned;
    const staff = await this.prisma.storeStaff.findFirst({ where: { userId } });
    if (staff && (staff.role === 'MANAGER' || staff.permissions.includes(perm))) return { id: staff.storefrontId };
    throw new ForbiddenException('Bạn không có quyền cho thao tác này');
  }

  // Kiểm tra quyền (chủ hoặc nhân viên có quyền)
  async can(userId: string, storefrontId: string, perm: string): Promise<boolean> {
    const s = await this.prisma.storefront.findUnique({ where: { id: storefrontId }, select: { ownerId: true } });
    if (s?.ownerId === userId) return true;
    const staff = await this.prisma.storeStaff.findUnique({ where: { storefrontId_userId: { storefrontId, userId } } });
    return !!staff && (staff.role === 'MANAGER' || staff.permissions.includes(perm));
  }
}
