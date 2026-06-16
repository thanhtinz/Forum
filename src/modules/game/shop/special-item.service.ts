import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Currency, SpecialItemType } from '@prisma/client';

@Injectable()
export class SpecialItemService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // MUA special item
  // ──────────────────────────────────────────────
  async buy(userId: string, templateId: string, currency: Currency) {
    const template = await this.prisma.specialItemTemplate.findUnique({ where: { id: templateId } });
    if (!template || !template.isActive) throw new NotFoundException('Vật phẩm không tồn tại');

    const price = currency === 'COIN' ? template.priceCoin : template.priceGem;
    if (price == null) throw new BadRequestException(`Không bán bằng ${currency}`);

    await this.prisma.$transaction(async (tx) => {
      if (currency === 'COIN') {
        const char = await tx.gameCharacter.findUnique({ where: { userId }, select: { id: true, coinBalance: true } });
        if (!char || char.coinBalance < price) throw new BadRequestException('Không đủ Coin');
        await tx.gameCharacter.update({ where: { id: char.id }, data: { coinBalance: { decrement: price } } });
        await tx.coinTransaction.create({
          data: { characterId: char.id, type: 'spend_special', amount: -price, balanceBefore: char.coinBalance, balanceAfter: char.coinBalance - price, refId: templateId, note: `Mua ${template.name}` },
        });
      } else {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { gemBalance: true } });
        if (!user || user.gemBalance < price) throw new BadRequestException('Không đủ Gem');
        await tx.user.update({ where: { id: userId }, data: { gemBalance: { decrement: price } } });
        await tx.gemTransaction.create({
          data: { userId, type: 'SPEND_PRODUCT', amount: -price, balanceBefore: user.gemBalance, balanceAfter: user.gemBalance - price, refId: templateId, note: `Mua ${template.name}` },
        });
      }

      const expiresAt = template.durationDays
        ? new Date(Date.now() + template.durationDays * 86400000)
        : null;

      await tx.userSpecialItem.create({
        data: { userId, templateId, expiresAt },
      });

      // Thẻ đổi tên: đánh dấu user có thể đổi tên
      if (template.type === 'RENAME_CARD') {
        await tx.userCosmetic.upsert({
          where: { userId },
          update: { hasRenameCard: true },
          create: { userId, hasRenameCard: true },
        });
      }

      if (template.stock != null) {
        await tx.specialItemTemplate.update({ where: { id: templateId }, data: { stock: { decrement: 1 } } });
      }
    });

    return { success: true, item: template.name };
  }

  // ──────────────────────────────────────────────
  // ĐỔI TÊN (cần có thẻ đổi tên)
  // ──────────────────────────────────────────────
  async renameUser(userId: string, newUsername: string) {
    const cosmetic = await this.prisma.userCosmetic.findUnique({ where: { userId } });
    if (!cosmetic?.hasRenameCard)
      throw new BadRequestException('Bạn cần mua thẻ đổi tên trước');

    // Validate username mới
    if (!/^[a-zA-Z0-9_]{3,50}$/.test(newUsername))
      throw new BadRequestException('Tên không hợp lệ (3-50 ký tự, chữ số và _)');

    const exists = await this.prisma.user.findUnique({ where: { username: newUsername } });
    if (exists) throw new ConflictException('Tên đã tồn tại');

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { username: newUsername } });
      await tx.userCosmetic.update({
        where: { userId },
        data: { hasRenameCard: false, renameCount: { increment: 1 } },
      });
      // Đánh dấu thẻ đã dùng
      const card = await tx.userSpecialItem.findFirst({
        where: { userId, isUsed: false, template: { type: 'RENAME_CARD' } },
      });
      if (card) {
        await tx.userSpecialItem.update({
          where: { id: card.id },
          data: { isUsed: true, usedAt: new Date() },
        });
      }
    });

    return { success: true, newUsername };
  }

  // ──────────────────────────────────────────────
  // KÍCH HOẠT NỔI BẬT TÊN / MÀU TÊN
  // ──────────────────────────────────────────────
  async activateNameEffect(userId: string, userItemId: string) {
    const userItem = await this.prisma.userSpecialItem.findFirst({
      where: { id: userItemId, userId, isUsed: false },
      include: { template: true },
    });
    if (!userItem) throw new NotFoundException('Vật phẩm không tồn tại hoặc đã dùng');

    const config = (userItem.template.effectConfig as any) ?? {};
    const expiresAt = userItem.template.durationDays
      ? new Date(Date.now() + userItem.template.durationDays * 86400000)
      : null;

    const updateData: any = {};

    switch (userItem.template.type) {
      case 'NAME_HIGHLIGHT':
        updateData.nameHighlight = config.style ?? 'glow'; // glow|gradient|rainbow
        updateData.nameHighlightUntil = expiresAt;
        break;
      case 'NAME_COLOR':
        updateData.nameColor = config.color ?? '#a78bfa';
        break;
      case 'AVATAR_FRAME':
        updateData.avatarFrame = config.frame;
        break;
      case 'PROFILE_BANNER':
        updateData.profileBanner = config.bannerUrl;
        break;
      default:
        throw new BadRequestException('Loại vật phẩm này không kích hoạt được');
    }

    await this.prisma.$transaction([
      this.prisma.userCosmetic.upsert({
        where: { userId },
        update: updateData,
        create: { userId, ...updateData },
      }),
      this.prisma.userSpecialItem.update({
        where: { id: userItemId },
        data: { isUsed: true, usedAt: new Date() },
      }),
    ]);

    return { success: true, effect: userItem.template.type };
  }

  // ──────────────────────────────────────────────
  // LẤY COSMETIC + INVENTORY special của user
  // ──────────────────────────────────────────────
  async getUserCosmetics(userId: string) {
    const [cosmetic, items] = await Promise.all([
      this.prisma.userCosmetic.findUnique({ where: { userId } }),
      this.prisma.userSpecialItem.findMany({
        where: { userId, isUsed: false },
        include: { template: true },
        orderBy: { acquiredAt: 'desc' },
      }),
    ]);
    return { cosmetic, items };
  }

  // ──────────────────────────────────────────────
  // SHOP: list special items đang bán
  // ──────────────────────────────────────────────
  async listShop() {
    return this.prisma.specialItemTemplate.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
