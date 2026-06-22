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

  // Tính lại VIP của user theo gem nạp tích lũy.
  // Mọi mốc đã đạt được lưu vĩnh viễn vào UserVipReward (badge + khung không mất).
  // Khi đạt mốc MỚI thì tự bật badge của mốc cao nhất; mốc đã đạt từ trước thì giữ nguyên lựa chọn bật/tắt của user.
  async recompute(userId: string) {
    const total = await this.topupTotal(userId);
    const reached = await this.prisma.vipTier.findMany({
      where: { isActive: true, gemRequired: { lte: total } },
      orderBy: { gemRequired: 'asc' },
    });
    if (reached.length === 0) return null;

    const existing = await this.prisma.userVipReward.findMany({ where: { userId }, select: { tierId: true } });
    const existingIds = new Set(existing.map((r) => r.tierId));
    let gotNew = false;

    for (const t of reached) {
      if (!existingIds.has(t.id)) gotNew = true;
      await this.prisma.userVipReward.upsert({
        where: { userId_tierId: { userId, tierId: t.id } },
        create: { userId, tierId: t.id, tierName: t.name, badgeUrl: t.badgeUrl ?? null, frameUrl: t.frameUrl ?? null, color: t.color ?? null, gemRequired: t.gemRequired },
        update: { tierName: t.name, badgeUrl: t.badgeUrl ?? null, frameUrl: t.frameUrl ?? null, color: t.color ?? null, gemRequired: t.gemRequired },
      });
    }

    const top = reached[reached.length - 1];
    // Đạt mốc mới → tự bật badge mốc cao nhất. Nếu không có mốc mới thì tôn trọng lựa chọn user.
    if (gotNew) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { vipTierName: top.name, vipBadgeUrl: top.badgeUrl ?? null },
      });
    }
    return top;
  }

  // Tính lại VIP cho TẤT CẢ user đã từng nạp gem (admin bấm để áp ngay)
  async recomputeAll() {
    const wallets = await this.prisma.gemWallet.findMany({ where: { totalTopup: { gt: 0 } }, select: { userId: true } });
    let updated = 0;
    for (const w of wallets) {
      const r = await this.recompute(w.userId);
      if (r) updated++;
    }
    return { scanned: wallets.length, updated };
  }

  // Kho VIP của user: tất cả badge đã nhận, kèm trạng thái đang bật
  async myRewards(userId: string) {
    const [rewards, user] = await Promise.all([
      this.prisma.userVipReward.findMany({ where: { userId }, orderBy: { gemRequired: 'asc' } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { vipBadgeUrl: true } }),
    ]);
    return rewards.map((r) => ({
      tierId: r.tierId,
      tierName: r.tierName,
      badgeUrl: r.badgeUrl,
      frameUrl: r.frameUrl,
      color: r.color,
      gemRequired: r.gemRequired,
      badgeEquipped: !!r.badgeUrl && user?.vipBadgeUrl === r.badgeUrl,
    }));
  }

  // Bật/tắt badge VIP — chọn badge của một mốc đã đạt, hoặc tắt (tierId=null)
  async equipBadge(userId: string, tierId: string | null) {
    if (!tierId) {
      await this.prisma.user.update({ where: { id: userId }, data: { vipBadgeUrl: null, vipTierName: null } });
      return { ok: true };
    }
    const reward = await this.prisma.userVipReward.findUnique({ where: { userId_tierId: { userId, tierId } } });
    if (!reward) throw new BadRequestException('Bạn chưa đạt mốc VIP này');
    await this.prisma.user.update({ where: { id: userId }, data: { vipBadgeUrl: reward.badgeUrl ?? null, vipTierName: reward.tierName } });
    return { ok: true };
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
