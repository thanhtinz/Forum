import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminConfigService } from '../admin/admin-config.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OutfitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AdminConfigService,
    private readonly events: EventEmitter2,
  ) {}

  // ──────────────────────────────────────────────
  // LẤY BOND + OUTFIT STATE của user với 1 character
  // ──────────────────────────────────────────────
  async getBondState(userId: string, characterId: string) {
    const character = await this.prisma.aiCharacter.findUnique({
      where: { id: characterId },
      include: { outfits: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!character) throw new NotFoundException('Character không tồn tại');

    let bond = await this.prisma.aiBond.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });

    // Tạo bond mới nếu chưa có
    if (!bond) {
      bond = await this.prisma.aiBond.create({
        data: {
          userId,
          characterId,
          currentOutfit: character.defaultOutfit,
        },
      });
      // Auto-unlock outfit mặc định
      const defaultOutfit = character.outfits.find((o) => o.slug === character.defaultOutfit);
      if (defaultOutfit) {
        await this.prisma.aiOutfitUnlock.upsert({
          where: { userId_outfitId: { userId, outfitId: defaultOutfit.id } },
          update: {},
          create: { userId, outfitId: defaultOutfit.id },
        });
      }
    }

    // Lấy danh sách outfit đã unlock
    const unlocks = await this.prisma.aiOutfitUnlock.findMany({
      where: { userId, outfitId: { in: character.outfits.map((o) => o.id) } },
      select: { outfitId: true },
    });
    const unlockedIds = new Set(unlocks.map((u) => u.outfitId));

    const outfits = character.outfits.map((o) => ({
      id: o.id,
      slug: o.slug,
      name: o.name,
      nameEn: o.nameEn,
      modelPath: o.modelPath,
      thumbnail: o.thumbnail,
      description: o.description,
      rarity: o.rarity,
      unlockBondLevel: o.unlockBondLevel,
      isUnlocked: unlockedIds.has(o.id) || bond!.bondLevel >= o.unlockBondLevel,
      isCurrent: o.slug === bond!.currentOutfit,
    }));

    return {
      character: { id: character.id, name: character.name, slug: character.slug },
      bond: {
        level: bond.bondLevel,
        points: bond.bondPoints,
        totalMessages: bond.totalMessages,
        currentOutfit: bond.currentOutfit,
        pointsToNextLevel: await this.getPointsPerLevel(),
      },
      outfits,
    };
  }

  // ──────────────────────────────────────────────
  // TĂNG BOND khi user tương tác (gọi sau mỗi tin nhắn AI)
  // ──────────────────────────────────────────────
  async addBondPoints(userId: string, characterId: string): Promise<{
    leveledUp: boolean;
    newLevel: number;
    unlockedOutfits: string[];
  }> {
    const pointsPerMsg = await this.config.get<number>('ai.bondPointsPerMessage', 1);
    const pointsPerLevel = await this.getPointsPerLevel();

    const bond = await this.prisma.aiBond.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });
    if (!bond) return { leveledUp: false, newLevel: 0, unlockedOutfits: [] };

    const newPoints = bond.bondPoints + pointsPerMsg;
    const newLevel = Math.floor(newPoints / pointsPerLevel);
    const leveledUp = newLevel > bond.bondLevel;

    await this.prisma.aiBond.update({
      where: { id: bond.id },
      data: {
        bondPoints: newPoints,
        bondLevel: newLevel,
        totalMessages: { increment: 1 },
        lastInteractAt: new Date(),
      },
    });

    const unlockedOutfits: string[] = [];

    // Nếu lên level → check unlock outfit mới
    if (leveledUp) {
      const newlyUnlockable = await this.prisma.aiOutfit.findMany({
        where: {
          characterId,
          unlockBondLevel: { lte: newLevel, gt: bond.bondLevel },
        },
      });

      for (const outfit of newlyUnlockable) {
        await this.prisma.aiOutfitUnlock.upsert({
          where: { userId_outfitId: { userId, outfitId: outfit.id } },
          update: {},
          create: { userId, outfitId: outfit.id },
        });
        unlockedOutfits.push(outfit.name);
      }

      this.events.emit('ai.bond.levelup', {
        userId, characterId, newLevel, unlockedOutfits,
      });
    }

    return { leveledUp, newLevel, unlockedOutfits };
  }

  // ──────────────────────────────────────────────
  // ĐỔI OUTFIT (user chọn outfit đã unlock)
  // ──────────────────────────────────────────────
  async switchOutfit(userId: string, characterId: string, outfitSlug: string) {
    const outfit = await this.prisma.aiOutfit.findUnique({
      where: { characterId_slug: { characterId, slug: outfitSlug } },
    });
    if (!outfit) throw new NotFoundException('Outfit không tồn tại');

    const bond = await this.prisma.aiBond.findUnique({
      where: { userId_characterId: { userId, characterId } },
    });
    if (!bond) throw new NotFoundException('Chưa có tương tác với character này');

    // Kiểm tra đã unlock
    const unlocked = await this.prisma.aiOutfitUnlock.findUnique({
      where: { userId_outfitId: { userId, outfitId: outfit.id } },
    });
    const meetsLevel = bond.bondLevel >= outfit.unlockBondLevel;

    if (!unlocked && !meetsLevel) {
      throw new ForbiddenException(
        `Cần đạt thiện cảm cấp ${outfit.unlockBondLevel} để mở outfit này`,
      );
    }

    await this.prisma.aiBond.update({
      where: { id: bond.id },
      data: { currentOutfit: outfitSlug },
    });

    return { currentOutfit: outfitSlug, modelPath: outfit.modelPath };
  }

  private async getPointsPerLevel(): Promise<number> {
    return this.config.get<number>('ai.bondPointsPerLevel', 100);
  }
}
