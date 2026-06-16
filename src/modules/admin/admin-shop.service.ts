import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EquipSlot, ItemRarity, ConsumableType, SpecialItemType } from '@prisma/client';

@Injectable()
export class AdminShopService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════
  // EQUIPMENT ITEMS (vũ khí, trang bị, skin)
  // ════════════════════════════════════════════
  async listEquipment() {
    return this.prisma.itemTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async createEquipment(data: {
    slug: string; name: string; description?: string;
    slot: EquipSlot; rarity: ItemRarity; spriteUrl: string; iconUrl?: string;
    reqLevel?: number;
    bonusStr?: number; bonusVit?: number; bonusAgi?: number; bonusInt?: number;
    bonusHp?: number; bonusAtk?: number; bonusDef?: number;
    priceCoin?: number; priceGem?: number;
    stock?: number; isTradeable?: boolean;
  }) {
    if (data.priceCoin == null && data.priceGem == null)
      throw new BadRequestException('Phải đặt ít nhất 1 loại giá (coin hoặc gem)');

    return this.prisma.itemTemplate.create({ data });
  }

  async updateEquipment(id: string, data: any) {
    const item = await this.prisma.itemTemplate.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item không tồn tại');
    return this.prisma.itemTemplate.update({ where: { id }, data });
  }

  async deleteEquipment(id: string) {
    // Soft delete để không hỏng inventory đã có
    return this.prisma.itemTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ════════════════════════════════════════════
  // CONSUMABLES (thức ăn, nước, thuốc)
  // ════════════════════════════════════════════
  async listConsumables() {
    return this.prisma.consumableTemplate.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createConsumable(data: {
    slug: string; name: string; description?: string;
    type: ConsumableType; iconUrl?: string; spriteUrl?: string;
    restoreHunger?: number; restoreThirst?: number; restoreHygiene?: number;
    restoreEnergy?: number; restoreHealth?: number; curesSickness?: boolean;
    priceCoin?: number; priceGem?: number; stock?: number;
  }) {
    if (data.priceCoin == null && data.priceGem == null)
      throw new BadRequestException('Phải đặt ít nhất 1 loại giá');
    return this.prisma.consumableTemplate.create({ data });
  }

  async updateConsumable(id: string, data: any) {
    return this.prisma.consumableTemplate.update({ where: { id }, data });
  }

  async deleteConsumable(id: string) {
    return this.prisma.consumableTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ════════════════════════════════════════════
  // SPECIAL ITEMS (thẻ đổi tên, nổi bật tên, boost...)
  // ════════════════════════════════════════════
  async listSpecialItems() {
    return this.prisma.specialItemTemplate.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createSpecialItem(data: {
    slug: string; name: string; description?: string;
    type: SpecialItemType; iconUrl?: string;
    effectConfig?: any; durationDays?: number;
    priceCoin?: number; priceGem?: number; stock?: number;
  }) {
    if (data.priceCoin == null && data.priceGem == null)
      throw new BadRequestException('Phải đặt ít nhất 1 loại giá');
    return this.prisma.specialItemTemplate.create({ data });
  }

  async updateSpecialItem(id: string, data: any) {
    return this.prisma.specialItemTemplate.update({ where: { id }, data });
  }

  async deleteSpecialItem(id: string) {
    return this.prisma.specialItemTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // ════════════════════════════════════════════
  // TROPHY MANAGEMENT
  // ════════════════════════════════════════════
  async listTrophies() {
    return this.prisma.trophy.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { userTrophies: true } } },
    });
  }

  async createTrophy(data: {
    slug: string; name: string; description: string;
    iconUrl?: string; points: number; criteria: any;
    isHidden?: boolean; sortOrder?: number;
  }) {
    return this.prisma.trophy.create({ data });
  }

  async updateTrophy(id: string, data: any) {
    return this.prisma.trophy.update({ where: { id }, data });
  }

  async deleteTrophy(id: string) {
    return this.prisma.trophy.delete({ where: { id } });
  }

  // ════════════════════════════════════════════
  // USER TITLE LADDER
  // ════════════════════════════════════════════
  async listTitles() {
    return this.prisma.userTitle.findMany({ orderBy: { minPoints: 'asc' } });
  }

  async createTitle(data: { name: string; minPoints: number; color?: string; iconUrl?: string }) {
    return this.prisma.userTitle.create({ data });
  }

  async updateTitle(id: string, data: any) {
    return this.prisma.userTitle.update({ where: { id }, data });
  }

  async deleteTitle(id: string) {
    return this.prisma.userTitle.delete({ where: { id } });
  }
}
