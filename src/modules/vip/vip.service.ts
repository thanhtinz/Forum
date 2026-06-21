import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VipService {
  constructor(private readonly prisma: PrismaService) {}

  // Gem nạp tích lũy của user
  private async topupTotal(userId: string): Promise<number> {
    const w = await this.prisma.gemWallet.findUnique({ where: { userId }, select: { totalTopup: true } });
    return w?.totalTopup ?? 0;
  }

  // Tính lại VIP của user theo gem nạp tích lũy; đạt mốc thì gán badge + khung avatar.
  // Chỉ tăng (gem nạp chỉ tăng), không bao giờ gỡ mốc đã đạt.
  async recompute(userId: string) {
    const total = await this.topupTotal(userId);
    const tier = await this.prisma.vipTier.findFirst({
      where: { isActive: true, gemRequired: { lte: total } },
      orderBy: { gemRequired: 'desc' },
    });
    if (!tier) return null;
    const data: any = { vipTierName: tier.name, vipBadgeUrl: tier.badgeUrl ?? null };
    if (tier.frameUrl) data.avatarFrameUrl = tier.frameUrl; // tự gắn khung VIP
    await this.prisma.user.update({ where: { id: userId }, data });
    return tier;
  }

  // Công khai: danh sách mốc + tiến trình của user (nếu đăng nhập)
  async listForUser(userId?: string) {
    const tiers = await this.prisma.vipTier.findMany({ where: { isActive: true }, orderBy: { gemRequired: 'asc' } });
    const total = userId ? await this.topupTotal(userId) : 0;
    const current = [...tiers].reverse().find((t) => total >= t.gemRequired) || null;
    return { tiers, total, currentTierId: current?.id ?? null };
  }

  // ── Admin ──
  adminList() { return this.prisma.vipTier.findMany({ orderBy: { gemRequired: 'asc' } }); }

  create(data: any) {
    if (!data?.name || data?.gemRequired == null) throw new BadRequestException('Thiếu tên hoặc mốc gem');
    return this.prisma.vipTier.create({
      data: {
        name: data.name, gemRequired: Number(data.gemRequired) || 0,
        badgeUrl: data.badgeUrl || null, frameUrl: data.frameUrl || null,
        color: data.color || null, sortOrder: data.sortOrder ?? 0, isActive: data.isActive ?? true,
      },
    });
  }

  update(id: string, data: any) {
    const patch: any = {};
    for (const k of ['name', 'badgeUrl', 'frameUrl', 'color', 'isActive', 'sortOrder']) if (data[k] !== undefined) patch[k] = data[k];
    if (data.gemRequired !== undefined) patch.gemRequired = Number(data.gemRequired) || 0;
    return this.prisma.vipTier.update({ where: { id }, data: patch });
  }

  remove(id: string) { return this.prisma.vipTier.delete({ where: { id } }); }
}
