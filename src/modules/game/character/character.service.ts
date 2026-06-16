import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AdminConfigService } from '../../admin/admin-config.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Gender, EquipSlot } from '@prisma/client';

const STAT_POINTS_PER_LEVEL = 5;

@Injectable()
export class CharacterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AdminConfigService,
    private readonly events: EventEmitter2,
  ) {}

  // ──────────────────────────────────────────────
  // TẠO NHÂN VẬT (lúc đăng ký / lần đầu vào game)
  // ──────────────────────────────────────────────
  async createCharacter(userId: string, gender: Gender, appearance?: {
    skinTone?: string; hairStyle?: number; hairColor?: string; faceType?: number;
  }) {
    const existing = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('Nhân vật đã tồn tại');

    const char = await this.prisma.gameCharacter.create({
      data: {
        userId,
        gender,
        skinTone: appearance?.skinTone ?? '#f0c8a0',
        hairStyle: appearance?.hairStyle ?? 1,
        hairColor: appearance?.hairColor ?? '#3a2a1a',
        faceType: appearance?.faceType ?? 1,
      },
    });

    // Tính combat power ban đầu
    await this.recalcCombatPower(char.id);
    return this.getCharacter(userId);
  }

  // ──────────────────────────────────────────────
  // LẤY NHÂN VẬT + trang bị + stats tổng
  // ──────────────────────────────────────────────
  async getCharacter(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({
      where: { userId },
      include: {
        equipped: {
          include: {
            inventoryItem: { include: { template: true } },
          },
        },
        guildMember: { include: { guild: { select: { id: true, name: true, tag: true } } } },
        skills: { include: { skill: true }, orderBy: { slotIndex: 'asc' } },
      },
    });
    if (!char) throw new NotFoundException('Chưa có nhân vật. Hãy tạo nhân vật trước.');

    const totalStats = this.computeTotalStats(char);
    return { ...char, totalStats };
  }

  // ──────────────────────────────────────────────
  // PHÂN BỔ ĐIỂM STAT (khi lên level)
  // ──────────────────────────────────────────────
  async allocateStats(userId: string, alloc: {
    strength?: number; vitality?: number; agility?: number; intelligence?: number;
  }) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    const total = (alloc.strength ?? 0) + (alloc.vitality ?? 0) + (alloc.agility ?? 0) + (alloc.intelligence ?? 0);
    if (total <= 0) throw new BadRequestException('Phải phân bổ ít nhất 1 điểm');
    if (total > char.statPoints)
      throw new BadRequestException(`Chỉ có ${char.statPoints} điểm, không thể phân bổ ${total}`);

    const updated = await this.prisma.gameCharacter.update({
      where: { id: char.id },
      data: {
        strength: { increment: alloc.strength ?? 0 },
        vitality: { increment: alloc.vitality ?? 0 },
        agility: { increment: alloc.agility ?? 0 },
        intelligence: { increment: alloc.intelligence ?? 0 },
        statPoints: { decrement: total },
      },
    });

    await this.recalcCombatPower(char.id);
    return this.getCharacter(userId);
  }

  // ──────────────────────────────────────────────
  // THÊM EXP TỪ FORUM (gọi khi đăng bài / được like)
  // Cơ chế level kiểu XenForo/Flarum
  // ──────────────────────────────────────────────
  async addForumExp(userId: string, exp: number, source: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) return null; // user chưa tạo nhân vật

    let newExp = char.exp + exp;
    let newLevel = char.level;
    let statPointsGained = 0;
    let coinGained = 0;

    // Tính level up dựa trên LevelCurve
    while (true) {
      const nextCurve = await this.prisma.levelCurve.findUnique({
        where: { level: newLevel + 1 },
      });
      if (!nextCurve || newExp < nextCurve.expRequired) break;
      newLevel++;
      statPointsGained += nextCurve.statPointReward;
      coinGained += nextCurve.coinReward;
    }

    const leveledUp = newLevel > char.level;

    await this.prisma.gameCharacter.update({
      where: { id: char.id },
      data: {
        exp: newExp,
        level: newLevel,
        statPoints: { increment: statPointsGained },
        coinBalance: { increment: coinGained },
      },
    });

    if (leveledUp) {
      await this.recalcCombatPower(char.id);
      if (coinGained > 0) {
        await this.logCoin(char.id, 'earn_levelup', coinGained, `Thưởng lên cấp ${newLevel}`);
      }
      this.events.emit('game.character.levelup', {
        userId, characterId: char.id, newLevel, statPointsGained,
      });
    }

    return { exp: newExp, level: newLevel, leveledUp, statPointsGained, coinGained };
  }

  // ──────────────────────────────────────────────
  // TÍNH COMBAT POWER (cache vào DB)
  // ──────────────────────────────────────────────
  async recalcCombatPower(characterId: string) {
    const char = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      include: {
        equipped: { include: { inventoryItem: { include: { template: true } } } },
      },
    });
    if (!char) return;

    const stats = this.computeTotalStats(char);
    // Công thức combat power
    const power =
      stats.strength * 3 +
      stats.vitality * 2 +
      stats.agility * 2 +
      stats.intelligence * 3 +
      stats.atk * 4 +
      stats.def * 3 +
      Math.floor(stats.hp / 10);

    await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: { combatPower: power },
    });
    return power;
  }

  // ──────────────────────────────────────────────
  // TÍNH TỔNG STATS (base + trang bị + enhance)
  // ──────────────────────────────────────────────
  computeTotalStats(char: any) {
    let str = char.strength;
    let vit = char.vitality;
    let agi = char.agility;
    let int = char.intelligence;
    let hp = char.vitality * 10;
    let atk = char.strength * 2;
    let def = 0;

    for (const eq of char.equipped ?? []) {
      const t = eq.inventoryItem.template;
      const enhanceMul = 1 + eq.inventoryItem.enhanceLevel * 0.1; // +10% mỗi cấp cường hóa
      str += Math.floor(t.bonusStr * enhanceMul);
      vit += Math.floor(t.bonusVit * enhanceMul);
      agi += Math.floor(t.bonusAgi * enhanceMul);
      int += Math.floor(t.bonusInt * enhanceMul);
      hp += Math.floor(t.bonusHp * enhanceMul);
      atk += Math.floor(t.bonusAtk * enhanceMul);
      def += Math.floor(t.bonusDef * enhanceMul);
    }

    return { strength: str, vitality: vit, agility: agi, intelligence: int, hp, atk, def };
  }

  // ──────────────────────────────────────────────
  // TRANG BỊ / THÁO ITEM
  // ──────────────────────────────────────────────
  async equipItem(userId: string, inventoryItemId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    const invItem = await this.prisma.inventoryItem.findFirst({
      where: { id: inventoryItemId, characterId: char.id },
      include: { template: true },
    });
    if (!invItem) throw new NotFoundException('Item không tồn tại trong túi');
    if (invItem.template.reqLevel > char.level)
      throw new BadRequestException(`Cần level ${invItem.template.reqLevel} để trang bị`);

    const slot = invItem.template.slot;

    await this.prisma.$transaction(async (tx) => {
      // Tháo item cũ cùng slot (nếu có)
      await tx.equippedItem.deleteMany({
        where: { characterId: char.id, slot },
      });
      // Trang bị mới
      await tx.equippedItem.create({
        data: { characterId: char.id, slot, inventoryItemId },
      });
    });

    await this.recalcCombatPower(char.id);
    return this.getCharacter(userId);
  }

  async unequipItem(userId: string, slot: EquipSlot) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    await this.prisma.equippedItem.deleteMany({
      where: { characterId: char.id, slot },
    });
    await this.recalcCombatPower(char.id);
    return this.getCharacter(userId);
  }

  // ──────────────────────────────────────────────
  // INVENTORY
  // ──────────────────────────────────────────────
  async getInventory(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    return this.prisma.inventoryItem.findMany({
      where: { characterId: char.id },
      include: { template: true, equipped: true },
      orderBy: { acquiredAt: 'desc' },
    });
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  /** Cộng/trừ coin theo userId (tự tạo nhân vật mặc định nếu chưa có). amount âm để trừ. */
  async adjustCoinByUser(userId: string, type: string, amount: number, note: string, refId?: string) {
    let char = await this.prisma.gameCharacter.findUnique({ where: { userId }, select: { id: true } });
    if (!char) {
      const created = await this.prisma.gameCharacter.create({ data: { userId, gender: 'MALE' } });
      await this.recalcCombatPower(created.id).catch(() => {});
      char = { id: created.id };
    }
    return this.logCoin(char.id, type, amount, note, refId);
  }

  async logCoin(characterId: string, type: string, amount: number, note: string, refId?: string) {
    return this.prisma.$transaction(async (tx) => {
      const char = await tx.gameCharacter.findUnique({
        where: { id: characterId },
        select: { coinBalance: true },
      });
      if (!char) throw new NotFoundException();
      const balanceAfter = char.coinBalance + amount;
      if (balanceAfter < 0) throw new BadRequestException('Không đủ coin');

      await tx.gameCharacter.update({
        where: { id: characterId },
        data: { coinBalance: balanceAfter },
      });
      await tx.coinTransaction.create({
        data: {
          characterId, type, amount,
          balanceBefore: char.coinBalance, balanceAfter,
          refId, note,
        },
      });
      return balanceAfter;
    });
  }
}
