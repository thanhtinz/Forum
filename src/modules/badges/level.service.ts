import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BadgeColor } from './badge.service';

const ALLOWED_COLORS: BadgeColor[] = ['red', 'blue', 'amber', 'green', 'gray', 'violet'];

// Map an arbitrary stored color string to one of the 6 allowed colors (fallback 'gray').
export function normalizeColor(raw: string | null | undefined): BadgeColor {
  if (!raw) return 'gray';
  const c = raw.trim().toLowerCase();
  if ((ALLOWED_COLORS as string[]).includes(c)) return c as BadgeColor;
  const aliases: Record<string, BadgeColor> = {
    purple: 'violet',
    indigo: 'violet',
    yellow: 'amber',
    orange: 'amber',
    gold: 'amber',
    emerald: 'green',
    teal: 'green',
    lime: 'green',
    cyan: 'blue',
    sky: 'blue',
    rose: 'red',
    pink: 'red',
    crimson: 'red',
    grey: 'gray',
    slate: 'gray',
    zinc: 'gray',
  };
  return aliases[c] ?? 'gray';
}

export interface UserScoreCounters {
  postCount: number;
  threadCount: number;
  reputationScore: number;
}

export interface CreateLevelTierDto {
  level: number;
  name: string;
  icon: string;
  color: string;
  minScore: number;
}

export type UpdateLevelTierDto = Partial<CreateLevelTierDto>;

export interface UserLevelInfo {
  level: number;
  name: string;
  icon: string;
  color: BadgeColor;
  score: number;
  nextTier?: { level: number; name: string; minScore: number };
}

@Injectable()
export class LevelService {
  constructor(private readonly prisma: PrismaService) {}

  scoreOf(user: UserScoreCounters): number {
    return user.postCount + user.threadCount * 2 + user.reputationScore;
  }

  listTiers() {
    return this.prisma.levelTier.findMany({ orderBy: { minScore: 'asc' } });
  }

  async getUserLevel(user: UserScoreCounters): Promise<UserLevelInfo | null> {
    const tiers = await this.listTiers();
    if (!tiers.length) return null;

    const score = this.scoreOf(user);

    // Highest tier with minScore <= score.
    let current: (typeof tiers)[number] | null = null;
    let currentIdx = -1;
    for (let i = 0; i < tiers.length; i++) {
      if (tiers[i].minScore <= score) {
        current = tiers[i];
        currentIdx = i;
      }
    }
    if (!current) return null;

    const next = tiers[currentIdx + 1];

    return {
      level: current.level,
      name: current.name,
      icon: current.icon,
      color: normalizeColor(current.color),
      score,
      nextTier: next
        ? { level: next.level, name: next.name, minScore: next.minScore }
        : undefined,
    };
  }

  createTier(dto: CreateLevelTierDto) {
    return this.prisma.levelTier.create({
      data: {
        level: dto.level,
        name: dto.name,
        icon: dto.icon,
        color: normalizeColor(dto.color),
        minScore: dto.minScore,
      },
    });
  }

  updateTier(id: string, dto: UpdateLevelTierDto) {
    return this.prisma.levelTier.update({
      where: { id },
      data: {
        level: dto.level,
        name: dto.name,
        icon: dto.icon,
        color: dto.color !== undefined ? normalizeColor(dto.color) : undefined,
        minScore: dto.minScore,
      },
    });
  }

  deleteTier(id: string) {
    return this.prisma.levelTier.delete({ where: { id } });
  }

  async getUserLevelByUserId(userId: string): Promise<UserLevelInfo | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { postCount: true, threadCount: true, reputationScore: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.getUserLevel(user);
  }
}
