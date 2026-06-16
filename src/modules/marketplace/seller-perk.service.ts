import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GemService } from '../gem/gem.service';

const CONFIG_KEY = 'seller_perks';

// Giá mặc định (gem) — admin chỉnh trong /admin
export interface PerkConfig {
  pinProduct: { d1: number; d7: number; d30: number };
  featureProduct: { d1: number; d7: number; d30: number };
  featureStore: { d1: number; d7: number; d30: number };
  aiShop: { month: number; forever: number };
}
const DEFAULT: PerkConfig = {
  pinProduct: { d1: 50, d7: 250, d30: 800 },
  featureProduct: { d1: 80, d7: 400, d30: 1200 },
  featureStore: { d1: 150, d7: 700, d30: 2000 },
  aiShop: { month: 500, forever: 5000 },
};
const DAYS: Record<string, number> = { d1: 1, d7: 7, d30: 30 };

@Injectable()
export class SellerPerkService {
  constructor(private readonly prisma: PrismaService, private readonly gem: GemService) {}

  async getConfig(): Promise<PerkConfig> {
    const row = await this.prisma.siteConfig.findUnique({ where: { key: CONFIG_KEY } });
    return { ...DEFAULT, ...((row?.value as object) ?? {}) };
  }
  async setConfig(patch: Partial<PerkConfig>) {
    const cur = await this.getConfig();
    const next = { ...cur, ...patch };
    await this.prisma.siteConfig.upsert({ where: { key: CONFIG_KEY }, update: { value: next as Prisma.InputJsonValue }, create: { key: CONFIG_KEY, value: next as Prisma.InputJsonValue } });
    return next;
  }

  private extend(base: Date | null, days: number) {
    const from = base && base.getTime() > Date.now() ? base.getTime() : Date.now();
    return new Date(from + days * 864e5);
  }
  private async store(userId: string) {
    const s = await this.prisma.storefront.findUnique({ where: { ownerId: userId } });
    if (!s) throw new BadRequestException('Bạn chưa có gian hàng');
    return s;
  }
  private async ownProduct(userId: string, productId: string) {
    const p = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!p) throw new NotFoundException('Sản phẩm không tồn tại');
    if (p.sellerId !== userId) throw new ForbiddenException('Không phải sản phẩm của bạn');
    return p;
  }

  // ── Ghim / Đề xuất sản phẩm ──
  async buyProductPerk(userId: string, productId: string, kind: 'pin' | 'feature', dur: 'd1' | 'd7' | 'd30') {
    const p = await this.ownProduct(userId, productId);
    const cfg = await this.getConfig();
    const price = (kind === 'pin' ? cfg.pinProduct : cfg.featureProduct)[dur];
    await this.gem.debit(userId, price, 'SPEND_PRODUCT', productId, kind === 'pin' ? 'Ghim sản phẩm' : 'Đề xuất sản phẩm');
    const field = kind === 'pin' ? 'pinnedUntil' : 'featuredUntil';
    const until = this.extend(p[field] as Date | null, DAYS[dur]);
    await this.prisma.product.update({ where: { id: productId }, data: { [field]: until } });
    return { ok: true, until, spent: price };
  }

  // ── Đề xuất gian hàng ──
  async buyStoreFeature(userId: string, dur: 'd1' | 'd7' | 'd30') {
    const s = await this.store(userId);
    const cfg = await this.getConfig();
    const price = cfg.featureStore[dur];
    await this.gem.debit(userId, price, 'SPEND_PRODUCT', s.id, 'Đề xuất gian hàng');
    const until = this.extend(s.featuredUntil, DAYS[dur]);
    await this.prisma.storefront.update({ where: { id: s.id }, data: { featuredUntil: until } });
    return { ok: true, until, spent: price };
  }

  // ── Gói AI shop ──
  async buyAi(userId: string, plan: 'month' | 'forever') {
    const s = await this.store(userId);
    const cfg = await this.getConfig();
    const price = plan === 'month' ? cfg.aiShop.month : cfg.aiShop.forever;
    await this.gem.debit(userId, price, 'SPEND_PRODUCT', s.id, 'Gói AI shop');
    if (plan === 'forever') await this.prisma.storefront.update({ where: { id: s.id }, data: { aiForever: true } });
    else await this.prisma.storefront.update({ where: { id: s.id }, data: { aiUntil: this.extend(s.aiUntil, 30) } });
    return { ok: true, plan, spent: price };
  }

  // Kiểm tra quyền dùng AI (cho SellerService.aiAssist)
  async isAiActive(userId: string): Promise<boolean> {
    const s = await this.prisma.storefront.findUnique({ where: { ownerId: userId }, select: { aiForever: true, aiUntil: true } });
    if (!s) return false;
    return s.aiForever || (!!s.aiUntil && s.aiUntil.getTime() > Date.now());
  }

  // Trạng thái dịch vụ của shop (cho dashboard)
  async myPerks(userId: string) {
    const s = await this.prisma.storefront.findUnique({ where: { ownerId: userId }, select: { featuredUntil: true, aiForever: true, aiUntil: true } });
    return {
      prices: await this.getConfig(),
      storeFeaturedUntil: s?.featuredUntil ?? null,
      aiForever: s?.aiForever ?? false,
      aiUntil: s?.aiUntil ?? null,
    };
  }
}
