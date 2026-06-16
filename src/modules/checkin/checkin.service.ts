import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CharacterService } from '../game/character/character.service';

export interface CheckInConfig {
  base: number;
  streakBonus: number;
  maxBonus: number;
  weeklyBonus: number;
}

export interface CheckInConfigDto {
  base?: number;
  streakBonus?: number;
  maxBonus?: number;
  weeklyBonus?: number;
}

const CONFIG_KEY = 'checkin.config';
const DEFAULT_CONFIG: CheckInConfig = {
  base: 50,
  streakBonus: 10,
  maxBonus: 200,
  weeklyBonus: 100,
};

@Injectable()
export class CheckInService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
  ) {}

  // ──────────────────────────────────────────────
  // CẤU HÌNH PHẦN THƯỞNG (SiteConfig key: checkin.config)
  // ──────────────────────────────────────────────
  async getConfig(): Promise<CheckInConfig> {
    const cfg = await this.prisma.siteConfig
      .findUnique({ where: { key: CONFIG_KEY } })
      .catch(() => null);
    const v = (cfg?.value ?? {}) as Record<string, unknown>;
    const num = (x: unknown, d: number) => {
      const n = typeof x === 'number' ? x : typeof x === 'string' ? parseInt(x, 10) : NaN;
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : d;
    };
    return {
      base: num(v.base, DEFAULT_CONFIG.base),
      streakBonus: num(v.streakBonus, DEFAULT_CONFIG.streakBonus),
      maxBonus: num(v.maxBonus, DEFAULT_CONFIG.maxBonus),
      weeklyBonus: num(v.weeklyBonus, DEFAULT_CONFIG.weeklyBonus),
    };
  }

  async setConfig(dto: CheckInConfigDto): Promise<CheckInConfig> {
    const current = await this.getConfig();
    const clamp = (x: unknown, d: number) =>
      typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : d;
    const next: CheckInConfig = {
      base: clamp(dto.base, current.base),
      streakBonus: clamp(dto.streakBonus, current.streakBonus),
      maxBonus: clamp(dto.maxBonus, current.maxBonus),
      weeklyBonus: clamp(dto.weeklyBonus, current.weeklyBonus),
    };
    await this.prisma.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: next as unknown as object },
      create: { key: CONFIG_KEY, value: next as unknown as object },
    });
    return next;
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  /** "Hôm nay" dạng Date tại UTC midnight (cho cột @db.Date). */
  private today(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private addDays(d: Date, days: number): Date {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days));
  }

  private sameDay(a: Date, b: Date): boolean {
    return (
      a.getUTCFullYear() === b.getUTCFullYear() &&
      a.getUTCMonth() === b.getUTCMonth() &&
      a.getUTCDate() === b.getUTCDate()
    );
  }

  /** Tính phần thưởng dựa trên streak + config. */
  private computeReward(streak: number, cfg: CheckInConfig): number {
    let reward = Math.min(
      cfg.base + (streak - 1) * cfg.streakBonus,
      cfg.base + cfg.maxBonus,
    );
    if (streak % 7 === 0) reward += cfg.weeklyBonus;
    return reward;
  }

  // ──────────────────────────────────────────────
  // TRẠNG THÁI ĐIỂM DANH
  // ──────────────────────────────────────────────
  async getStatus(userId: string) {
    const cfg = await this.getConfig();
    const today = this.today();
    const yesterday = this.addDays(today, -1);

    const history = await this.prisma.checkIn.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 30,
    });

    const last = history[0] ?? null;
    let checkedInToday = false;
    let currentStreak = 0;

    if (last) {
      if (this.sameDay(last.date, today)) {
        checkedInToday = true;
        currentStreak = last.streak;
      } else if (this.sameDay(last.date, yesterday)) {
        // chuỗi vẫn còn hiệu lực, hôm nay chưa điểm danh
        currentStreak = last.streak;
      } else {
        // đứt chuỗi
        currentStreak = 0;
      }
    }

    // Preview phần thưởng nếu hôm nay chưa điểm danh
    const nextStreak = checkedInToday ? currentStreak : currentStreak + 1;
    const todayReward = checkedInToday
      ? last!.reward
      : this.computeReward(nextStreak, cfg);

    return {
      checkedInToday,
      currentStreak,
      todayReward,
      history,
      config: cfg,
    };
  }

  // ──────────────────────────────────────────────
  // ĐIỂM DANH
  // ──────────────────────────────────────────────
  async checkIn(userId: string) {
    const cfg = await this.getConfig();
    const today = this.today();
    const yesterday = this.addDays(today, -1);

    const existing = await this.prisma.checkIn.findUnique({
      where: { userId_date: { userId, date: today } },
    });
    if (existing) throw new BadRequestException('Hôm nay bạn đã điểm danh rồi');

    const prev = await this.prisma.checkIn.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const streak =
      prev && this.sameDay(prev.date, yesterday) ? prev.streak + 1 : 1;
    const reward = this.computeReward(streak, cfg);

    const row = await this.prisma.checkIn.create({
      data: { userId, date: today, streak, reward },
    });

    const dateLabel = today.toLocaleDateString('vi-VN', { timeZone: 'UTC' });
    const balance = await this.character.adjustCoinByUser(
      userId,
      'checkin',
      reward,
      `Điểm danh ngày ${dateLabel}`,
      row.id,
    );

    return { reward, streak, balance };
  }
}
