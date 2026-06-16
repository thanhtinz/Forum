import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CharacterService } from '../game/character/character.service';

export interface CreateWheelDto {
  name: string;
  costCoin?: number;
  isActive?: boolean;
}

export interface UpdateWheelDto {
  name?: string;
  costCoin?: number;
  isActive?: boolean;
}

export interface SegmentDto {
  label: string;
  icon?: string | null;
  color?: string | null;
  rewardType?: string; // coin | item | badge | nothing
  rewardAmount?: number;
  rewardRefId?: string | null;
  weight?: number;
  sortOrder?: number;
}

@Injectable()
export class SpinService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
  ) {}

  // ── Public ──
  async getActiveWheel() {
    const wheel = await this.prisma.spinWheel.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: { segments: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!wheel) return null;
    return {
      id: wheel.id,
      name: wheel.name,
      costCoin: wheel.costCoin,
      isActive: wheel.isActive,
      segments: wheel.segments.map((s) => ({
        id: s.id,
        label: s.label,
        icon: s.icon,
        color: s.color,
        rewardType: s.rewardType,
        rewardAmount: s.rewardAmount,
      })),
    };
  }

  async spin(userId: string) {
    const wheel = await this.prisma.spinWheel.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: { segments: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!wheel) throw new NotFoundException('Không có vòng quay đang hoạt động');
    if (wheel.segments.length === 0)
      throw new BadRequestException('Vòng quay chưa có ô phần thưởng');

    // Trừ coin (ném lỗi nếu không đủ)
    let balance: number;
    try {
      balance = await this.character.adjustCoinByUser(
        userId,
        'spin_cost',
        -wheel.costCoin,
        'Quay may mắn',
      );
    } catch {
      throw new BadRequestException('Không đủ coin để quay');
    }

    // Chọn ô theo trọng số ngẫu nhiên
    const totalWeight = wheel.segments.reduce(
      (sum, s) => sum + Math.max(0, s.weight),
      0,
    );
    let rand = Math.random() * (totalWeight > 0 ? totalWeight : wheel.segments.length);
    let picked = wheel.segments[wheel.segments.length - 1];
    for (const s of wheel.segments) {
      const w = totalWeight > 0 ? Math.max(0, s.weight) : 1;
      if (rand < w) {
        picked = s;
        break;
      }
      rand -= w;
    }

    // Trao thưởng
    if (picked.rewardType === 'coin' && picked.rewardAmount > 0) {
      balance = await this.character.adjustCoinByUser(
        userId,
        'spin_win',
        picked.rewardAmount,
        'Trúng vòng quay',
        wheel.id,
      );
    } else if (picked.rewardType === 'badge' && picked.rewardRefId) {
      await this.prisma.userBadge
        .upsert({
          where: { userId_badgeId: { userId, badgeId: picked.rewardRefId } },
          create: { userId, badgeId: picked.rewardRefId },
          update: {},
        })
        .catch(() => {});
    } else if (picked.rewardType === 'item' && picked.rewardRefId) {
      // Best-effort: tạo InventoryItem nếu template tồn tại
      try {
        const template = await this.prisma.itemTemplate.findUnique({
          where: { id: picked.rewardRefId },
          select: { id: true },
        });
        if (template) {
          let char = await this.prisma.gameCharacter.findUnique({
            where: { userId },
            select: { id: true },
          });
          if (!char) {
            // Đảm bảo nhân vật tồn tại (adjustCoinByUser ở trên đã tạo nếu cần)
            char = await this.prisma.gameCharacter.findUnique({
              where: { userId },
              select: { id: true },
            });
          }
          if (char) {
            await this.prisma.inventoryItem.create({
              data: {
                characterId: char.id,
                templateId: template.id,
                quantity: Math.max(1, picked.rewardAmount || 1),
              },
            });
          }
        }
      } catch {
        // Bỏ qua một cách an toàn nếu không tạo được item
      }
    }
    // 'nothing' → không trao gì

    await this.prisma.spinHistory.create({
      data: {
        userId,
        wheelId: wheel.id,
        segmentLabel: picked.label,
        rewardType: picked.rewardType,
        rewardAmount: picked.rewardAmount,
      },
    });

    return {
      segment: {
        label: picked.label,
        rewardType: picked.rewardType,
        rewardAmount: picked.rewardAmount,
        color: picked.color,
        icon: picked.icon,
      },
      balance,
    };
  }

  myHistory(userId: string, limit = 20) {
    return this.prisma.spinHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(1, limit), 100),
    });
  }

  // ── Admin ──
  listWheels() {
    return this.prisma.spinWheel.findMany({
      orderBy: { createdAt: 'asc' },
      include: { segments: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  createWheel(dto: CreateWheelDto) {
    return this.prisma.spinWheel.create({
      data: {
        name: dto.name,
        costCoin: dto.costCoin ?? 100,
        isActive: dto.isActive ?? true,
      },
      include: { segments: true },
    });
  }

  async updateWheel(id: string, dto: UpdateWheelDto) {
    await this.ensureWheel(id);
    return this.prisma.spinWheel.update({
      where: { id },
      data: {
        name: dto.name,
        costCoin: dto.costCoin,
        isActive: dto.isActive,
      },
      include: { segments: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async deleteWheel(id: string) {
    await this.ensureWheel(id);
    await this.prisma.spinWheel.delete({ where: { id } });
    return { ok: true };
  }

  async addSegment(wheelId: string, dto: SegmentDto) {
    await this.ensureWheel(wheelId);
    return this.prisma.spinSegment.create({
      data: {
        wheelId,
        label: dto.label,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
        rewardType: dto.rewardType ?? 'coin',
        rewardAmount: dto.rewardAmount ?? 0,
        rewardRefId: dto.rewardRefId ?? null,
        weight: dto.weight ?? 1,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateSegment(id: string, dto: SegmentDto) {
    const seg = await this.prisma.spinSegment.findUnique({ where: { id } });
    if (!seg) throw new NotFoundException('Không tìm thấy ô phần thưởng');
    return this.prisma.spinSegment.update({
      where: { id },
      data: {
        label: dto.label,
        icon: dto.icon,
        color: dto.color,
        rewardType: dto.rewardType,
        rewardAmount: dto.rewardAmount,
        rewardRefId: dto.rewardRefId,
        weight: dto.weight,
        sortOrder: dto.sortOrder,
      },
    });
  }

  async deleteSegment(id: string) {
    const seg = await this.prisma.spinSegment.findUnique({ where: { id } });
    if (!seg) throw new NotFoundException('Không tìm thấy ô phần thưởng');
    await this.prisma.spinSegment.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureWheel(id: string) {
    const wheel = await this.prisma.spinWheel.findUnique({ where: { id } });
    if (!wheel) throw new NotFoundException('Không tìm thấy vòng quay');
    return wheel;
  }
}
