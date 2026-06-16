import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinigameType } from '@prisma/client';

@Injectable()
export class AdminGameAssetService {
  constructor(private readonly prisma: PrismaService) {}

  // ════════════════════════════════════════════
  // MINIGAME CONFIG — cấu hình + asset
  // ════════════════════════════════════════════
  async listMinigames() {
    return this.prisma.minigameConfig.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async upsertMinigame(type: MinigameType, data: {
    name: string; description?: string; iconUrl?: string;
    minBet?: number; maxBet?: number; houseFee?: number;
    maxPlayers?: number; minPlayers?: number;
    assetConfig?: any; isActive?: boolean;
  }) {
    return this.prisma.minigameConfig.upsert({
      where: { type },
      update: data,
      create: { type, ...data, name: data.name },
    });
  }

  // Cập nhật asset cho 1 game (sprites cho bài, xúc xắc, con thú...)
  async updateMinigameAssets(type: MinigameType, assetConfig: any) {
    const game = await this.prisma.minigameConfig.findUnique({ where: { type } });
    if (!game) throw new NotFoundException('Game không tồn tại');
    return this.prisma.minigameConfig.update({
      where: { type },
      data: { assetConfig },
    });
  }

  // ════════════════════════════════════════════
  // STICKER PACK — upload zip, đặt tên
  // ════════════════════════════════════════════
  async listStickerPacks() {
    return this.prisma.stickerPack.findMany({
      include: { stickers: true, _count: { select: { stickers: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // Tạo pack (sau khi đã giải nén zip và upload ảnh lên S3)
  async createStickerPack(data: {
    slug: string; name: string; description?: string;
    thumbnailUrl?: string; isPremium?: boolean;
    priceCoin?: number; priceGem?: number;
    stickers: { name: string; imageUrl: string }[];
  }) {
    if (!data.stickers?.length) throw new BadRequestException('Pack phải có ít nhất 1 sticker');

    return this.prisma.stickerPack.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl ?? data.stickers[0].imageUrl,
        isPremium: data.isPremium ?? false,
        priceCoin: data.priceCoin,
        priceGem: data.priceGem,
        stickers: {
          create: data.stickers.map((s, i) => ({
            name: s.name,
            imageUrl: s.imageUrl,
            sortOrder: i,
          })),
        },
      },
      include: { stickers: true },
    });
  }

  async updateStickerPack(id: string, data: any) {
    return this.prisma.stickerPack.update({ where: { id }, data });
  }

  async deleteStickerPack(id: string) {
    return this.prisma.stickerPack.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // Thêm sticker vào pack đã có
  async addStickerToPack(packId: string, sticker: { name: string; imageUrl: string }) {
    const pack = await this.prisma.stickerPack.findUnique({ where: { id: packId } });
    if (!pack) throw new NotFoundException('Pack không tồn tại');
    const count = await this.prisma.sticker.count({ where: { packId } });
    return this.prisma.sticker.create({
      data: { packId, name: sticker.name, imageUrl: sticker.imageUrl, sortOrder: count },
    });
  }

  async removeSticker(stickerId: string) {
    return this.prisma.sticker.delete({ where: { id: stickerId } });
  }
}
