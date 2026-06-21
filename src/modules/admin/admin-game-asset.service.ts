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

  // ───────── Thư viện avatar (pack ảnh đại diện cho user chọn) ─────────
  async listAvatarPacks() {
    return this.prisma.avatarPack.findMany({
      include: { avatars: { orderBy: { sortOrder: 'asc' } }, _count: { select: { avatars: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createAvatarPack(data: {
    slug: string; name: string; description?: string; thumbnailUrl?: string;
    avatars: { name?: string; imageUrl: string }[];
  }) {
    if (!data.avatars?.length) throw new BadRequestException('Pack phải có ít nhất 1 avatar');
    return this.prisma.avatarPack.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl ?? data.avatars[0].imageUrl,
        avatars: {
          create: data.avatars.map((a, i) => ({ name: a.name || `Avatar ${i + 1}`, imageUrl: a.imageUrl, sortOrder: i })),
        },
      },
      include: { avatars: true },
    });
  }

  async updateAvatarPack(id: string, data: any) {
    return this.prisma.avatarPack.update({ where: { id }, data });
  }

  async deleteAvatarPack(id: string) {
    return this.prisma.avatarPack.delete({ where: { id } });
  }

  async addAvatarToPack(packId: string, avatar: { name?: string; imageUrl: string }) {
    const pack = await this.prisma.avatarPack.findUnique({ where: { id: packId } });
    if (!pack) throw new NotFoundException('Pack không tồn tại');
    const count = await this.prisma.avatarImage.count({ where: { packId } });
    return this.prisma.avatarImage.create({
      data: { packId, name: avatar.name || `Avatar ${count + 1}`, imageUrl: avatar.imageUrl, sortOrder: count },
    });
  }

  async removeAvatar(avatarId: string) {
    return this.prisma.avatarImage.delete({ where: { id: avatarId } });
  }

  // Công khai — danh sách avatar đang bật cho user chọn
  async avatarLibrary() {
    return this.prisma.avatarPack.findMany({
      where: { isActive: true },
      include: { avatars: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ───────── Khung avatar (sản phẩm) — quản trị ─────────
  listFrames() {
    return this.prisma.avatarFrameProduct.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  createFrame(data: {
    slug: string; name: string; description?: string; imageUrl: string;
    priceCoin?: number | null; coinDays?: number | null;
    priceGem?: number | null; gemDays?: number | null;
    isActive?: boolean; sortOrder?: number;
  }) {
    if (!data.slug || !data.name || !data.imageUrl) throw new BadRequestException('Thiếu slug, tên hoặc ảnh khung');
    if (data.priceCoin == null && data.priceGem == null) throw new BadRequestException('Phải có ít nhất 1 giá (Xu hoặc Gem)');
    return this.prisma.avatarFrameProduct.create({
      data: {
        slug: data.slug, name: data.name, description: data.description, imageUrl: data.imageUrl,
        priceCoin: data.priceCoin ?? null, coinDays: data.coinDays ?? null,
        priceGem: data.priceGem ?? null, gemDays: data.gemDays ?? null,
        isActive: data.isActive ?? true, sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  updateFrame(id: string, data: any) {
    return this.prisma.avatarFrameProduct.update({ where: { id }, data });
  }

  deleteFrame(id: string) {
    return this.prisma.avatarFrameProduct.delete({ where: { id } });
  }
}
