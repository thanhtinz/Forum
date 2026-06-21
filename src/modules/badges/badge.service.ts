import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { LevelService } from './level.service';

export type BadgeColor = 'red' | 'blue' | 'amber' | 'green' | 'gray' | 'violet';

export interface BadgeDescriptor {
  key: string;
  label: string;
  icon: string;
  color: BadgeColor;
  kind: 'role' | 'verify' | 'seller' | 'milestone' | 'level';
  description?: string;
}

export interface CreateBadgeDto {
  name: string;
  description?: string;
  icon: string;
  color: string;
  condition?: Prisma.InputJsonValue | null;
  isAuto?: boolean;
  usableBy?: string;
}

export type UpdateBadgeDto = Partial<CreateBadgeDto>;

const ALLOWED_COLORS: BadgeColor[] = ['red', 'blue', 'amber', 'green', 'gray', 'violet'];

// Map an arbitrary stored color string to one of the 6 allowed colors.
function normalizeColor(raw: string | null | undefined): BadgeColor {
  if (!raw) return 'amber';
  // Màu hex tự chọn → giữ nguyên (frontend tự render bằng inline style)
  if (raw.trim().startsWith('#')) return raw.trim() as BadgeColor;
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
  return aliases[c] ?? 'amber';
}

function roleBadge(role: UserRole): BadgeDescriptor | null {
  switch (role) {
    case 'ADMIN':
      return { key: 'role:ADMIN', label: 'Quản trị viên', icon: 'Shield', color: 'red', kind: 'role' };
    case 'MODERATOR':
      return { key: 'role:MODERATOR', label: 'Điều hành viên', icon: 'ShieldHalf', color: 'violet', kind: 'role' };
    case 'VIP':
      return { key: 'role:VIP', label: 'VIP', icon: 'Star', color: 'amber', kind: 'role' };
    case 'MEMBER':
      return { key: 'role:MEMBER', label: 'Thành viên', icon: 'User', color: 'gray', kind: 'role' };
    case 'GUEST':
    default:
      return null;
  }
}

const VERIFY_BADGE: BadgeDescriptor = {
  key: 'verify',
  label: 'Đã xác minh',
  icon: 'BadgeCheck',
  color: 'blue',
  kind: 'verify',
};

type ConditionType = 'postCount' | 'threadCount' | 'reputationScore';

function parseCondition(condition: Prisma.JsonValue | null): { type: ConditionType; gte: number } | null {
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) return null;
  const obj = condition as Record<string, unknown>;
  const type = obj.type;
  const gte = obj.gte;
  if (
    (type === 'postCount' || type === 'threadCount' || type === 'reputationScore') &&
    typeof gte === 'number'
  ) {
    return { type, gte };
  }
  return null;
}

@Injectable()
export class BadgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly levels: LevelService,
  ) {}

  // ── Icon ảnh (asset) admin tải lên cho badge hệ thống (role/verify/seller) ──
  // Lưu trong SiteConfig key 'badge.systemIcons' = { 'verify': url, 'role:ADMIN': url, 'seller': url, 'seller_verified': url, ... }
  async getSystemIcons(): Promise<Record<string, string>> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'badge.systemIcons' } });
    const v = cfg?.value;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, string>) : {};
  }

  async setSystemIcons(icons: Record<string, string>) {
    const clean: Record<string, string> = {};
    for (const [k, val] of Object.entries(icons || {})) {
      if (typeof val === 'string' && val.trim()) clean[k] = val.trim();
    }
    await this.prisma.siteConfig.upsert({
      where: { key: 'badge.systemIcons' },
      update: { value: clean },
      create: { key: 'badge.systemIcons', value: clean },
    });
    return clean;
  }

  async getUserBadges(userId: string): Promise<BadgeDescriptor[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        isVerified: true,
        verifiedBadge: true,
        postCount: true,
        threadCount: true,
        reputationScore: true,
        badges: { include: { badge: true }, orderBy: { awardedAt: 'asc' } },
      },
    });
    if (!user) return [];

    const out: BadgeDescriptor[] = [];

    // 1. Verify (admin-granted verified badge)
    if (user.verifiedBadge) out.push(VERIFY_BADGE);

    // 2. Role (always except GUEST)
    const rb = roleBadge(user.role);
    if (rb) out.push(rb);

    // 2b. Level (activity-score based)
    const lvl = await this.levels.getUserLevel({
      postCount: user.postCount,
      threadCount: user.threadCount,
      reputationScore: user.reputationScore,
    });
    if (lvl) {
      out.push({
        key: 'level:' + lvl.level,
        label: `Lv.${lvl.level} ${lvl.name}`,
        icon: lvl.icon,
        color: normalizeColor(lvl.color),
        kind: 'level',
        description: `Điểm hoạt động: ${lvl.score}`,
      });
    }

    // 3. Milestones
    for (const ub of user.badges) {
      const b = ub.badge;
      out.push({
        key: 'milestone:' + b.id,
        label: b.name,
        icon: b.icon,
        color: normalizeColor(b.color),
        kind: 'milestone',
        description: b.description ?? undefined,
      });
    }

    // Áp icon ảnh admin cấu hình cho badge hệ thống (nếu có)
    const sys = await this.getSystemIcons();
    if (Object.keys(sys).length) {
      for (const d of out) {
        if (sys[d.key]) d.icon = sys[d.key];
      }
    }

    return out;
  }

  // Cheap bulk helper for lists: returns only role/verify/seller badges (no milestones).
  async getBulkRoleBadges(userIds: string[]): Promise<Record<string, BadgeDescriptor[]>> {
    const map: Record<string, BadgeDescriptor[]> = {};
    if (!userIds.length) return map;
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        role: true,
        verifiedBadge: true,
      },
    });
    for (const u of users) {
      const list: BadgeDescriptor[] = [];
      if (u.verifiedBadge) list.push(VERIFY_BADGE);
      const rb = roleBadge(u.role);
      if (rb) list.push(rb);
      map[u.id] = list;
    }
    return map;
  }

  listCatalog() {
    return this.prisma.badge.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createBadge(dto: CreateBadgeDto) {
    const isAuto = !!dto.isAuto && !!dto.condition;
    return this.prisma.badge.create({
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        color: dto.color,
        condition: isAuto ? (dto.condition as Prisma.InputJsonValue) : Prisma.JsonNull,
        isAuto,
        usableBy: dto.usableBy === 'staff' ? 'staff' : 'all',
      },
    });
  }

  updateBadge(id: string, dto: UpdateBadgeDto) {
    const data: Prisma.BadgeUpdateInput = {
      name: dto.name,
      description: dto.description,
      icon: dto.icon,
      color: dto.color,
    };
    if (dto.isAuto !== undefined || dto.condition !== undefined) {
      const isAuto = !!dto.isAuto && !!dto.condition;
      data.isAuto = isAuto;
      data.condition = isAuto ? (dto.condition as Prisma.InputJsonValue) : Prisma.JsonNull;
    }
    if (dto.usableBy !== undefined) data.usableBy = dto.usableBy === 'staff' ? 'staff' : 'all';
    return this.prisma.badge.update({ where: { id }, data });
  }

  deleteBadge(id: string) {
    return this.prisma.badge.delete({ where: { id } });
  }

  async awardBadge(userId: string, badgeId: string) {
    return this.prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId } },
      update: {},
      create: { userId, badgeId },
    });
  }

  async revokeBadge(userId: string, badgeId: string) {
    await this.prisma.userBadge
      .delete({ where: { userId_badgeId: { userId, badgeId } } })
      .catch(() => undefined);
    return { ok: true };
  }

  async setVerified(userId: string, value: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { verifiedBadge: value },
      select: { id: true, verifiedBadge: true },
    });
  }

  // Lazily award auto milestone badges whose numeric threshold is met.
  async recomputeMilestones(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        postCount: true,
        threadCount: true,
        reputationScore: true,
        badges: { select: { badgeId: true } },
      },
    });
    if (!user) return 0;

    const owned = new Set(user.badges.map((b) => b.badgeId));
    const autoBadges = await this.prisma.badge.findMany({ where: { isAuto: true } });

    const stats: Record<ConditionType, number> = {
      postCount: user.postCount,
      threadCount: user.threadCount,
      reputationScore: user.reputationScore,
    };

    let awarded = 0;
    for (const b of autoBadges) {
      if (owned.has(b.id)) continue;
      const cond = parseCondition(b.condition);
      if (!cond) continue;
      if (stats[cond.type] >= cond.gte) {
        try {
          await this.prisma.userBadge.create({ data: { userId, badgeId: b.id } });
          awarded++;
        } catch {
          // Ignore (e.g. race -> already awarded); don't abort the loop.
        }
      }
    }
    return awarded;
  }
}
