import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GemService } from '../gem/gem.service';

type Currency = 'coin' | 'gem';
const DAY = 86400000;

@Injectable()
export class AvatarFrameService {
  constructor(private readonly prisma: PrismaService, private readonly gem: GemService) {}

  // ───────── Công khai: danh sách khung đang bán ─────────
  listProducts() {
    return this.prisma.avatarFrameProduct.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  // ───────── Kho của user (khung đã sở hữu) ─────────
  async inventory(userId: string) {
    const [rows, user] = await Promise.all([
      this.prisma.userAvatarFrame.findMany({ where: { userId }, include: { frame: true }, orderBy: { acquiredAt: 'desc' } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { avatarFrameId: true } }),
    ]);
    const now = new Date();
    return rows.map((r) => ({
      id: r.id,
      frameId: r.frameId,
      name: r.frame.name,
      imageUrl: r.frame.imageUrl,
      expiresAt: r.expiresAt,
      expired: r.expiresAt ? r.expiresAt < now : false,
      equipped: user?.avatarFrameId === r.frameId,
    }));
  }

  // ───────── Mua khung (coin hoặc gem) ─────────
  async buy(userId: string, productId: string, currency: Currency) {
    const p = await this.prisma.avatarFrameProduct.findUnique({ where: { id: productId } });
    if (!p || !p.isActive) throw new NotFoundException('Khung không tồn tại');
    const price = currency === 'coin' ? p.priceCoin : p.priceGem;
    const days = currency === 'coin' ? p.coinDays : p.gemDays;
    if (price == null) throw new BadRequestException(`Khung này không bán bằng ${currency === 'coin' ? 'Xu' : 'Gem'}`);

    // Trừ tiền
    if (currency === 'gem') {
      await this.gem.debit(userId, price, 'SPEND_PRODUCT', p.id, `Mua khung avatar ${p.name}`);
    } else {
      await this.spendCoin(userId, price, `Mua khung avatar ${p.name}`, p.id);
    }

    // Tính hạn mới — gia hạn cộng dồn; bản vĩnh viễn (days=null) thì luôn vĩnh viễn
    const existing = await this.prisma.userAvatarFrame.findUnique({ where: { userId_frameId: { userId, frameId: p.id } } });
    let expiresAt: Date | null;
    if (days == null) {
      expiresAt = null; // vĩnh viễn
    } else if (existing && existing.expiresAt == null) {
      expiresAt = null; // đã vĩnh viễn rồi thì giữ vĩnh viễn
    } else {
      const base = existing?.expiresAt && existing.expiresAt > new Date() ? existing.expiresAt : new Date();
      expiresAt = new Date(base.getTime() + days * DAY);
    }

    if (existing) {
      await this.prisma.userAvatarFrame.update({ where: { id: existing.id }, data: { expiresAt } });
    } else {
      await this.prisma.userAvatarFrame.create({ data: { userId, frameId: p.id, expiresAt } });
    }
    return { ok: true, expiresAt };
  }

  // ───────── Bật/tắt khung ─────────
  async equip(userId: string, frameId: string | null) {
    if (!frameId) {
      await this.prisma.user.update({ where: { id: userId }, data: { avatarFrameId: null, avatarFrameUrl: null } });
      return { ok: true };
    }
    const owned = await this.prisma.userAvatarFrame.findUnique({ where: { userId_frameId: { userId, frameId } }, include: { frame: true } });
    if (!owned) throw new BadRequestException('Bạn chưa sở hữu khung này');
    if (owned.expiresAt && owned.expiresAt < new Date()) throw new BadRequestException('Khung đã hết hạn, hãy gia hạn để dùng tiếp');
    await this.prisma.user.update({ where: { id: userId }, data: { avatarFrameId: frameId, avatarFrameUrl: owned.frame.imageUrl } });
    return { ok: true };
  }

  // Trừ Xu (coin) trực tiếp + ghi lịch sử
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
        data: { characterId: char.id, type: 'spend_frame', amount: -amount, balanceBefore: char.coinBalance, balanceAfter: char.coinBalance - amount, refId, note },
      }),
    ]);
  }
}
