import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CharacterService } from '../character/character.service';

// Tốc độ suy giảm mỗi giờ
const DECAY_PER_HOUR = {
  hunger: 4,
  thirst: 6,
  hygiene: 2,
  energy: 3,
};

// Ngưỡng cảnh báo
const CRITICAL_THRESHOLD = 20;

@Injectable()
export class SurvivalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
  ) {}

  // ──────────────────────────────────────────────
  // LẤY TRẠNG THÁI SURVIVAL (tính suy giảm theo thời gian thực)
  // ──────────────────────────────────────────────
  async getSurvival(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    let survival = await this.prisma.characterSurvival.findUnique({
      where: { characterId: char.id },
    });

    if (!survival) {
      survival = await this.prisma.characterSurvival.create({
        data: { characterId: char.id },
      });
    }

    // Tính suy giảm dựa trên thời gian trôi qua
    const now = new Date();
    const hoursPassed = (now.getTime() - survival.lastUpdated.getTime()) / 3600000;

    if (hoursPassed > 0.1) {
      const newStats = this.applyDecay(survival, hoursPassed);
      survival = await this.prisma.characterSurvival.update({
        where: { characterId: char.id },
        data: { ...newStats, lastUpdated: now },
      });
    }

    return {
      ...survival,
      status: this.evaluateStatus(survival),
      warnings: this.getWarnings(survival),
    };
  }

  // ──────────────────────────────────────────────
  // DÙNG CONSUMABLE (ăn/uống/thuốc)
  // ──────────────────────────────────────────────
  async consume(userId: string, consumableId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    const item = await this.prisma.consumableTemplate.findUnique({
      where: { id: consumableId },
    });
    if (!item) throw new NotFoundException('Vật phẩm không tồn tại');

    // Lấy survival hiện tại (đã tính decay)
    const current = await this.getSurvival(userId);

    const updated = await this.prisma.characterSurvival.update({
      where: { characterId: char.id },
      data: {
        hunger: Math.min(100, current.hunger + item.restoreHunger),
        thirst: Math.min(100, current.thirst + item.restoreThirst),
        hygiene: Math.min(100, current.hygiene + item.restoreHygiene),
        energy: Math.min(100, current.energy + item.restoreEnergy),
        health: Math.min(100, current.health + item.restoreHealth),
        isSick: item.curesSickness ? false : current.isSick,
        sickness: item.curesSickness ? null : current.sickness,
        sickUntil: item.curesSickness ? null : current.sickUntil,
        lastFed: item.restoreHunger > 0 ? new Date() : undefined,
        lastDrink: item.restoreThirst > 0 ? new Date() : undefined,
        lastUpdated: new Date(),
      },
    });

    return {
      ...updated,
      consumed: item.name,
      status: this.evaluateStatus(updated),
    };
  }

  // ──────────────────────────────────────────────
  // NGỦ (hồi energy)
  // ──────────────────────────────────────────────
  async sleep(userId: string, hours: number) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');
    if (hours < 1 || hours > 12) throw new BadRequestException('Số giờ ngủ từ 1-12');

    const current = await this.getSurvival(userId);
    const energyGain = hours * 12; // mỗi giờ +12 energy

    const updated = await this.prisma.characterSurvival.update({
      where: { characterId: char.id },
      data: {
        energy: Math.min(100, current.energy + energyGain),
        // Ngủ cũng làm đói/khát giảm thêm
        hunger: Math.max(0, current.hunger - hours * 2),
        thirst: Math.max(0, current.thirst - hours * 3),
        health: Math.min(100, current.health + Math.floor(hours / 2)),
        lastSleep: new Date(),
        lastUpdated: new Date(),
      },
    });

    return { ...updated, sleptHours: hours, status: this.evaluateStatus(updated) };
  }

  // ──────────────────────────────────────────────
  // VỆ SINH (hồi hygiene)
  // ──────────────────────────────────────────────
  async clean(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    const updated = await this.prisma.characterSurvival.update({
      where: { characterId: char.id },
      data: { hygiene: 100, lastClean: new Date(), lastUpdated: new Date() },
    });
    return { ...updated, status: this.evaluateStatus(updated) };
  }

  // ──────────────────────────────────────────────
  // CRON: cập nhật survival hàng loạt + gây bệnh nếu chỉ số thấp
  // Gọi từ BullMQ scheduled job
  // ──────────────────────────────────────────────
  async processBatchDecay() {
    const survivals = await this.prisma.characterSurvival.findMany({
      where: {
        lastUpdated: { lt: new Date(Date.now() - 3600000) }, // > 1h
      },
      take: 500,
    });

    let sickCount = 0;
    for (const s of survivals) {
      const hours = (Date.now() - s.lastUpdated.getTime()) / 3600000;
      const decayed = this.applyDecay(s, hours);

      // Gây bệnh nếu nhiều chỉ số thấp
      const lowStats = [decayed.hunger, decayed.thirst, decayed.hygiene, decayed.energy]
        .filter((v) => v < CRITICAL_THRESHOLD).length;
      const shouldGetSick = lowStats >= 2 && !s.isSick && Math.random() < 0.3;

      await this.prisma.characterSurvival.update({
        where: { id: s.id },
        data: {
          ...decayed,
          lastUpdated: new Date(),
          isSick: shouldGetSick ? true : decayed.health <= 0 ? true : s.isSick,
          sickness: shouldGetSick ? this.randomSickness() : s.sickness,
          sickUntil: shouldGetSick ? new Date(Date.now() + 86400000) : s.sickUntil,
        },
      });
      if (shouldGetSick) sickCount++;
    }

    return { processed: survivals.length, newlySick: sickCount };
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  private applyDecay(s: any, hours: number) {
    // Bệnh làm health giảm nhanh hơn
    const healthDecay = s.isSick ? Math.floor(hours * 5) : 0;
    // Chỉ số thấp cũng ảnh hưởng health
    const newHunger = Math.max(0, s.hunger - Math.floor(DECAY_PER_HOUR.hunger * hours));
    const newThirst = Math.max(0, s.thirst - Math.floor(DECAY_PER_HOUR.thirst * hours));
    const newHygiene = Math.max(0, s.hygiene - Math.floor(DECAY_PER_HOUR.hygiene * hours));
    const newEnergy = Math.max(0, s.energy - Math.floor(DECAY_PER_HOUR.energy * hours));

    // Health giảm nếu đói/khát = 0
    let healthPenalty = healthDecay;
    if (newHunger === 0) healthPenalty += Math.floor(hours * 3);
    if (newThirst === 0) healthPenalty += Math.floor(hours * 4);

    return {
      hunger: newHunger,
      thirst: newThirst,
      hygiene: newHygiene,
      energy: newEnergy,
      health: Math.max(0, s.health - healthPenalty),
    };
  }

  private evaluateStatus(s: any): string {
    if (s.health <= 0) return 'critical';
    if (s.isSick) return 'sick';
    const avg = (s.hunger + s.thirst + s.hygiene + s.energy) / 4;
    if (avg < CRITICAL_THRESHOLD) return 'poor';
    if (avg < 50) return 'fair';
    if (avg < 80) return 'good';
    return 'excellent';
  }

  private getWarnings(s: any): string[] {
    const w: string[] = [];
    if (s.hunger < CRITICAL_THRESHOLD) w.push('Nhân vật đang rất đói!');
    if (s.thirst < CRITICAL_THRESHOLD) w.push('Nhân vật đang rất khát!');
    if (s.hygiene < CRITICAL_THRESHOLD) w.push('Cần vệ sinh ngay!');
    if (s.energy < CRITICAL_THRESHOLD) w.push('Nhân vật kiệt sức, cần ngủ!');
    if (s.isSick) w.push(`Nhân vật đang bị bệnh: ${s.sickness}`);
    if (s.health < CRITICAL_THRESHOLD) w.push('Sức khỏe nguy hiểm!');
    return w;
  }

  private randomSickness(): string {
    const list = ['Cảm lạnh', 'Sốt', 'Đau bụng', 'Mệt mỏi', 'Nhiễm trùng'];
    return list[Math.floor(Math.random() * list.length)];
  }
}
