import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, GemTxType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CharacterService } from '../game/character/character.service';

export interface GiftReward {
  type: 'coin' | 'gem' | 'badge' | 'item' | 'sticker';
  amount?: number;
  refId?: string;
  label?: string;
}

export interface CreateGiftCodeDto {
  code?: string;
  rewards: GiftReward[];
  maxUses?: number;
  perUserLimit?: number;
  expiresAt?: string | null;
  isActive?: boolean;
  note?: string;
}

const VALID_TYPES = ['coin', 'gem', 'badge', 'item', 'sticker'];

@Injectable()
export class GiftcodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
  ) {}

  // ──────────────────────────────────────────────
  // ADMIN
  // ──────────────────────────────────────────────
  list() {
    return this.prisma.giftCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { redemptions: true } } },
    });
  }

  async create(dto: CreateGiftCodeDto) {
    const rewards = this.normalize(dto.rewards);
    if (!rewards.length) throw new BadRequestException('Phải có ít nhất 1 phần thưởng hợp lệ');
    const code = (dto.code?.trim() || this.genCode()).toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(code)) throw new BadRequestException('Mã chỉ gồm chữ/số/-/_ (3–40 ký tự)');
    const dup = await this.prisma.giftCode.findUnique({ where: { code } });
    if (dup) throw new BadRequestException('Mã này đã tồn tại');
    return this.prisma.giftCode.create({
      data: {
        code,
        rewards: rewards as unknown as Prisma.InputJsonValue,
        maxUses: Math.max(0, Math.floor(dto.maxUses ?? 0)),
        perUserLimit: Math.max(1, Math.floor(dto.perUserLimit ?? 1)),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
        note: dto.note?.slice(0, 255) || null,
      },
    });
  }

  async toggle(id: string) {
    const g = await this.prisma.giftCode.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Không tìm thấy mã');
    return this.prisma.giftCode.update({ where: { id }, data: { isActive: !g.isActive } });
  }

  async remove(id: string) {
    await this.prisma.giftCode.delete({ where: { id } }).catch(() => undefined);
    return { ok: true };
  }

  private normalize(arr: GiftReward[]): GiftReward[] {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => r && VALID_TYPES.includes(r.type))
      .map((r) => ({
        type: r.type,
        amount: r.amount != null ? Math.max(1, Math.floor(Number(r.amount))) : undefined,
        refId: r.refId || undefined,
        label: r.label || undefined,
      }))
      .filter((r) => {
        if (r.type === 'coin' || r.type === 'gem') return (r.amount ?? 0) > 0;
        return !!r.refId; // badge/item/special/sticker cần refId
      });
  }

  private genCode(len = 10): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  // ──────────────────────────────────────────────
  // USER — đổi mã
  // ──────────────────────────────────────────────
  async redeem(userId: string, codeRaw: string) {
    const code = (codeRaw || '').trim().toUpperCase();
    if (!code) throw new BadRequestException('Nhập mã giftcode');

    const gift = await this.prisma.giftCode.findUnique({ where: { code } });
    if (!gift || !gift.isActive) throw new BadRequestException('Mã không tồn tại hoặc đã bị tắt');
    if (gift.expiresAt && gift.expiresAt.getTime() < Date.now()) throw new BadRequestException('Mã đã hết hạn');
    if (gift.maxUses > 0 && gift.usedCount >= gift.maxUses) throw new BadRequestException('Mã đã hết lượt sử dụng');

    const usedByUser = await this.prisma.giftCodeRedemption.count({ where: { codeId: gift.id, userId } });
    if (usedByUser >= gift.perUserLimit) throw new BadRequestException('Bạn đã sử dụng mã này rồi');

    const rewards = (gift.rewards as unknown as GiftReward[]) || [];
    const granted: { type: string; label: string }[] = [];
    for (const r of rewards) {
      const g = await this.grant(userId, r, gift.id).catch(() => null);
      if (g) granted.push(g);
    }
    if (!granted.length) throw new BadRequestException('Không trao được phần thưởng nào (kiểm tra cấu hình mã)');

    await this.prisma.$transaction([
      this.prisma.giftCodeRedemption.create({
        data: { codeId: gift.id, userId, rewards: rewards as unknown as Prisma.InputJsonValue },
      }),
      this.prisma.giftCode.update({ where: { id: gift.id }, data: { usedCount: { increment: 1 } } }),
    ]);

    return { ok: true, rewards: granted };
  }

  private async ensureCharacterId(userId: string): Promise<string> {
    let char = await this.prisma.gameCharacter.findUnique({ where: { userId }, select: { id: true } });
    if (!char) char = await this.prisma.gameCharacter.create({ data: { userId, gender: 'MALE' }, select: { id: true } });
    return char.id;
  }

  private async creditGem(userId: string, amount: number, refId: string) {
    await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({ where: { id: userId }, select: { gemBalance: true } });
      if (!u) throw new NotFoundException();
      const after = u.gemBalance + amount;
      await tx.user.update({ where: { id: userId }, data: { gemBalance: after } });
      await tx.gemTransaction.create({
        data: { userId, type: GemTxType.BONUS, amount, balanceBefore: u.gemBalance, balanceAfter: after, refId, refType: 'giftcode', note: 'Quà giftcode' },
      });
    });
  }

  private async grant(userId: string, r: GiftReward, refId: string): Promise<{ type: string; label: string } | null> {
    const amount = Math.max(1, Number(r.amount) || 1);
    switch (r.type) {
      case 'coin':
        await this.character.adjustCoinByUser(userId, 'giftcode', amount, 'Quà giftcode', refId);
        return { type: 'coin', label: `${amount.toLocaleString()} Xu` };
      case 'gem':
        await this.creditGem(userId, amount, refId);
        return { type: 'gem', label: `${amount.toLocaleString()} Gem` };
      case 'badge': {
        if (!r.refId) return null;
        const b = await this.prisma.badge.findUnique({ where: { id: r.refId }, select: { name: true } });
        if (!b) return null;
        await this.prisma.userBadge.upsert({
          where: { userId_badgeId: { userId, badgeId: r.refId } },
          create: { userId, badgeId: r.refId }, update: {},
        });
        return { type: 'badge', label: `Huy hiệu ${b.name}` };
      }
      case 'item': {
        // Vật phẩm = nông sản vào KHO nông trại (hiển thị ở /game/kho, bán được lấy Xu)
        if (!r.refId) return null;
        const crop = await this.prisma.cropTemplate.findUnique({ where: { id: r.refId }, select: { slug: true, name: true, sellPrice: true, asset: true } });
        if (!crop) return null;
        const charId = await this.ensureCharacterId(userId);
        await this.prisma.warehouseItem.upsert({
          where: { characterId_slug_category: { characterId: charId, slug: crop.slug, category: 'CROP' } },
          update: { quantity: { increment: amount }, unitSell: crop.sellPrice, asset: crop.asset ?? undefined },
          create: { characterId: charId, slug: crop.slug, name: crop.name, category: 'CROP', unitSell: crop.sellPrice, asset: crop.asset ?? null, quantity: amount },
        });
        return { type: 'item', label: `${crop.name} ×${amount}` };
      }
      case 'sticker': {
        if (!r.refId) return null;
        const pack = await this.prisma.stickerPack.findUnique({ where: { id: r.refId }, select: { name: true } });
        if (!pack) return null;
        await this.prisma.userStickerPack.upsert({
          where: { userId_packId: { userId, packId: r.refId } },
          create: { userId, packId: r.refId }, update: {},
        });
        return { type: 'sticker', label: `Gói sticker ${pack.name}` };
      }
    }
    return null;
  }
}
