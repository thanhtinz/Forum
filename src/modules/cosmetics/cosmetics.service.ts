import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GemService } from '../gem/gem.service';

type Currency = 'coin' | 'gem';
const DAY = 86400000;

@Injectable()
export class CosmeticsService {
  constructor(private readonly prisma: PrismaService, private readonly gem: GemService) {}

  // ───────────────── BADGE TRANG TRÍ (ảnh) ─────────────────
  listBadges() {
    return this.prisma.badgeProduct.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  async badgeInventory(userId: string) {
    const [rows, user] = await Promise.all([
      this.prisma.userBadgeProduct.findMany({ where: { userId }, include: { badge: true }, orderBy: { acquiredAt: 'desc' } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { shopBadgeUrl: true } }),
    ]);
    const now = new Date();
    return rows.map((r) => ({
      id: r.id,
      badgeId: r.badgeId,
      name: r.badge.name,
      imageUrl: r.badge.imageUrl,
      expiresAt: r.expiresAt as Date | null,
      expired: r.expiresAt ? r.expiresAt < now : false,
      equipped: user?.shopBadgeUrl === r.badge.imageUrl,
    }));
  }

  async buyBadge(userId: string, productId: string, currency: Currency) {
    const p = await this.prisma.badgeProduct.findUnique({ where: { id: productId } });
    if (!p || !p.isActive) throw new NotFoundException('Badge không tồn tại');
    const price = currency === 'coin' ? p.priceCoin : p.priceGem;
    const days = currency === 'coin' ? p.coinDays : p.gemDays;
    if (price == null) throw new BadRequestException(`Badge này không bán bằng ${currency === 'coin' ? 'Xu' : 'Gem'}`);

    if (currency === 'gem') await this.gem.debit(userId, price, 'SPEND_PRODUCT', p.id, `Mua badge ${p.name}`);
    else await this.spendCoin(userId, price, `Mua badge ${p.name}`, p.id);

    const expiresAt = await this.computeExpiry(this.prisma.userBadgeProduct, { userId, badgeId: p.id }, days);
    const existing = await this.prisma.userBadgeProduct.findUnique({ where: { userId_badgeId: { userId, badgeId: p.id } } });
    if (existing) await this.prisma.userBadgeProduct.update({ where: { id: existing.id }, data: { expiresAt } });
    else await this.prisma.userBadgeProduct.create({ data: { userId, badgeId: p.id, expiresAt } });
    return { ok: true, expiresAt };
  }

  async equipBadge(userId: string, badgeId: string | null) {
    if (!badgeId) {
      await this.prisma.user.update({ where: { id: userId }, data: { shopBadgeUrl: null } });
      return { ok: true };
    }
    const owned = await this.prisma.userBadgeProduct.findUnique({ where: { userId_badgeId: { userId, badgeId } }, include: { badge: true } });
    if (!owned) throw new BadRequestException('Bạn chưa sở hữu badge này');
    if (owned.expiresAt && owned.expiresAt < new Date()) throw new BadRequestException('Badge đã hết hạn, hãy gia hạn để dùng tiếp');
    await this.prisma.user.update({ where: { id: userId }, data: { shopBadgeUrl: owned.badge.imageUrl } });
    return { ok: true };
  }

  // ───────────────── HIỆU ỨNG TÊN (CSS) ─────────────────
  listEffects() {
    return this.prisma.nameEffectProduct.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  async effectInventory(userId: string) {
    const [rows, user] = await Promise.all([
      this.prisma.userNameEffect.findMany({ where: { userId }, include: { effect: true }, orderBy: { acquiredAt: 'desc' } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { nameEffectCss: true } }),
    ]);
    const now = new Date();
    return rows.map((r) => ({
      id: r.id,
      effectId: r.effectId,
      name: r.effect.name,
      css: r.effect.css,
      expiresAt: r.expiresAt as Date | null,
      expired: r.expiresAt ? r.expiresAt < now : false,
      equipped: user?.nameEffectCss === r.effect.css,
    }));
  }

  async buyEffect(userId: string, productId: string, currency: Currency) {
    const p = await this.prisma.nameEffectProduct.findUnique({ where: { id: productId } });
    if (!p || !p.isActive) throw new NotFoundException('Hiệu ứng không tồn tại');
    const price = currency === 'coin' ? p.priceCoin : p.priceGem;
    const days = currency === 'coin' ? p.coinDays : p.gemDays;
    if (price == null) throw new BadRequestException(`Hiệu ứng này không bán bằng ${currency === 'coin' ? 'Xu' : 'Gem'}`);

    if (currency === 'gem') await this.gem.debit(userId, price, 'SPEND_PRODUCT', p.id, `Mua hiệu ứng tên ${p.name}`);
    else await this.spendCoin(userId, price, `Mua hiệu ứng tên ${p.name}`, p.id);

    const expiresAt = await this.computeExpiry(this.prisma.userNameEffect, { userId, effectId: p.id }, days);
    const existing = await this.prisma.userNameEffect.findUnique({ where: { userId_effectId: { userId, effectId: p.id } } });
    if (existing) await this.prisma.userNameEffect.update({ where: { id: existing.id }, data: { expiresAt } });
    else await this.prisma.userNameEffect.create({ data: { userId, effectId: p.id, expiresAt } });
    return { ok: true, expiresAt };
  }

  async equipEffect(userId: string, effectId: string | null) {
    if (!effectId) {
      await this.prisma.user.update({ where: { id: userId }, data: { nameEffectCss: null } });
      return { ok: true };
    }
    const owned = await this.prisma.userNameEffect.findUnique({ where: { userId_effectId: { userId, effectId } }, include: { effect: true } });
    if (!owned) throw new BadRequestException('Bạn chưa sở hữu hiệu ứng này');
    if (owned.expiresAt && owned.expiresAt < new Date()) throw new BadRequestException('Hiệu ứng đã hết hạn, hãy gia hạn để dùng tiếp');
    await this.prisma.user.update({ where: { id: userId }, data: { nameEffectCss: owned.effect.css } });
    return { ok: true };
  }

  // ───────────────── helpers ─────────────────
  // Gia hạn cộng dồn; bản vĩnh viễn (days=null) thì luôn vĩnh viễn
  private async computeExpiry(model: any, where: any, days: number | null | undefined): Promise<Date | null> {
    const key = where.badgeId ? { userId_badgeId: where } : { userId_effectId: where };
    const existing = await model.findUnique({ where: key });
    if (days == null) return null;
    if (existing && existing.expiresAt == null) return null;
    const base = existing?.expiresAt && existing.expiresAt > new Date() ? existing.expiresAt : new Date();
    return new Date(base.getTime() + days * DAY);
  }

  private async spendCoin(userId: string, amount: number, note: string, refId: string) {
    let char = await this.prisma.gameCharacter.findUnique({ where: { userId }, select: { id: true, coinBalance: true } });
    if (!char) {
      const c = await this.prisma.gameCharacter.create({ data: { userId, gender: 'MALE' } });
      char = { id: c.id, coinBalance: c.coinBalance };
    }
    if (char.coinBalance < amount) throw new BadRequestException(`Không đủ Xu. Cần ${amount}, có ${char.coinBalance}`);
    await this.prisma.$transaction([
      this.prisma.gameCharacter.update({ where: { id: char.id }, data: { coinBalance: { decrement: amount } } }),
      this.prisma.coinTransaction.create({
        data: { characterId: char.id, type: 'spend_cosmetic', amount: -amount, balanceBefore: char.coinBalance, balanceAfter: char.coinBalance - amount, refId, note },
      }),
    ]);
  }
}
