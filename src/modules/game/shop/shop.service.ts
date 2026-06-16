import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CharacterService } from '../character/character.service';
import { GemService } from '../../gem/gem.service';
import { EquipSlot, ItemRarity } from '@prisma/client';
import { Currency } from '../../../common/enums';

@Injectable()
export class ShopService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
    private readonly gem: GemService,
  ) {}

  // ──────────────────────────────────────────────
  // DANH SÁCH ITEM TRONG SHOP
  // ──────────────────────────────────────────────
  async listItems(filter?: { slot?: EquipSlot; rarity?: ItemRarity; currency?: Currency }) {
    const where: any = { isActive: true };
    if (filter?.slot) where.slot = filter.slot;
    if (filter?.rarity) where.rarity = filter.rarity;
    if (filter?.currency === 'COIN') where.priceCoin = { not: null };
    if (filter?.currency === 'GEM') where.priceGem = { not: null };

    return this.prisma.itemTemplate.findMany({
      where,
      orderBy: [{ rarity: 'asc' }, { reqLevel: 'asc' }],
    });
  }

  // ──────────────────────────────────────────────
  // MUA ITEM (chọn trả bằng coin hoặc gem)
  // ──────────────────────────────────────────────
  async buyItem(userId: string, templateId: string, currency: Currency, quantity = 1) {
    const template = await this.prisma.itemTemplate.findUnique({ where: { id: templateId } });
    if (!template || !template.isActive) throw new NotFoundException('Item không tồn tại');

    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    // Xác định giá theo loại tiền
    const unitPrice = currency === 'COIN' ? template.priceCoin : template.priceGem;
    if (unitPrice == null)
      throw new BadRequestException(`Item này không bán bằng ${currency === 'COIN' ? 'Coin' : 'Gem'}`);

    const totalPrice = unitPrice * quantity;

    // Kiểm tra stock
    if (template.stock != null && template.stock < quantity)
      throw new BadRequestException('Hết hàng');

    // Thanh toán + nhận item trong transaction
    await this.prisma.$transaction(async (tx) => {
      if (currency === 'COIN') {
        if (char.coinBalance < totalPrice)
          throw new BadRequestException(`Không đủ Coin. Cần ${totalPrice}, có ${char.coinBalance}`);
        await tx.gameCharacter.update({
          where: { id: char.id },
          data: { coinBalance: { decrement: totalPrice } },
        });
        await tx.coinTransaction.create({
          data: {
            characterId: char.id, type: 'spend_shop', amount: -totalPrice,
            balanceBefore: char.coinBalance, balanceAfter: char.coinBalance - totalPrice,
            refId: templateId, note: `Mua ${template.name} x${quantity}`,
          },
        });
      } else {
        // GEM — dùng user.gemBalance
        const user = await tx.user.findUnique({ where: { id: userId }, select: { gemBalance: true } });
        if (!user || user.gemBalance < totalPrice)
          throw new BadRequestException(`Không đủ Gem. Cần ${totalPrice}`);
        await tx.user.update({
          where: { id: userId },
          data: { gemBalance: { decrement: totalPrice } },
        });
        await tx.gemTransaction.create({
          data: {
            userId, type: 'SPEND_PRODUCT', amount: -totalPrice,
            balanceBefore: user.gemBalance, balanceAfter: user.gemBalance - totalPrice,
            refId: templateId, note: `Mua ${template.name} x${quantity}`,
          },
        });
      }

      // Giảm stock
      if (template.stock != null) {
        await tx.itemTemplate.update({
          where: { id: templateId },
          data: { stock: { decrement: quantity } },
        });
      }

      // Thêm vào inventory (stack nếu cùng template + enhance 0)
      const existing = await tx.inventoryItem.findFirst({
        where: { characterId: char.id, templateId, enhanceLevel: 0 },
      });
      if (existing && template.slot !== 'SKIN') {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantity: { increment: quantity } },
        });
      } else {
        await tx.inventoryItem.create({
          data: { characterId: char.id, templateId, quantity },
        });
      }
    });

    return { success: true, item: template.name, currency, totalPrice };
  }

  // ──────────────────────────────────────────────
  // CƯỜNG HÓA ITEM (tốn coin, tỷ lệ thành công)
  // ──────────────────────────────────────────────
  async enhanceItem(userId: string, inventoryItemId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, characterId: char.id },
      include: { template: true },
    });
    if (!item) throw new NotFoundException('Item không tồn tại');
    if (item.enhanceLevel >= 15) throw new BadRequestException('Đã đạt cấp cường hóa tối đa (+15)');

    // Chi phí tăng theo cấp
    const cost = 100 * (item.enhanceLevel + 1);
    if (char.coinBalance < cost)
      throw new BadRequestException(`Cần ${cost} Coin để cường hóa`);

    // Tỷ lệ thành công giảm dần
    const successRate = Math.max(0.2, 1 - item.enhanceLevel * 0.05);
    const success = Math.random() < successRate;

    await this.character.logCoin(char.id, 'spend_enhance', -cost, `Cường hóa ${item.template.name}`);

    if (success) {
      await this.prisma.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { enhanceLevel: { increment: 1 } },
      });
      // Cập nhật combat power nếu đang trang bị
      await this.character.recalcCombatPower(char.id);
      return { success: true, newLevel: item.enhanceLevel + 1, cost };
    }

    return { success: false, newLevel: item.enhanceLevel, cost };
  }
}
