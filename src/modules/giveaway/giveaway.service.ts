import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CharacterService } from '../game/character/character.service';
import { GemService } from '../gem/gem.service';
import { UserRole } from '@prisma/client';

export interface CreateGiveawayDto {
  title: string;
  description?: string;
  rewardKind: 'coin' | 'gem';
  totalAmount: number;
  winnersCount: number;
  mode: 'raffle' | 'envelope';
  threadId?: string;
  endsAt?: string;
}

const USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
} as const;

// Lì xì / Rút thăm: host nạp trước tổng phần thưởng (coin hoặc gem),
// người tham gia nhận thưởng (envelope: ngay khi tham gia; raffle: khi host quay).
@Injectable()
export class GiveawayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
    private readonly gem: GemService,
  ) {}

  // ── Cộng/trừ tiền thưởng (coin qua CharacterService, gem qua GemService) ──
  private async debitUser(userId: string, kind: string, amount: number, note: string, refId?: string) {
    if (kind === 'gem') {
      await this.gem.debit(userId, amount, 'SPEND_PRODUCT', refId, note);
    } else {
      await this.character.adjustCoinByUser(userId, 'giveaway_fund', -amount, note, refId);
    }
  }

  private async creditUser(userId: string, kind: string, amount: number, note: string, refId?: string) {
    if (amount <= 0) return;
    if (kind === 'gem') {
      await this.gem.credit(userId, amount, 'BONUS', refId, note);
    } else {
      await this.character.adjustCoinByUser(userId, 'giveaway_win', amount, note, refId);
    }
  }

  async create(hostId: string, dto: CreateGiveawayDto) {
    const totalAmount = Math.floor(Number(dto.totalAmount));
    const winnersCount = Math.floor(Number(dto.winnersCount));
    const rewardKind = dto.rewardKind === 'gem' ? 'gem' : 'coin';
    const mode = dto.mode === 'envelope' ? 'envelope' : 'raffle';

    if (!dto.title?.trim()) throw new BadRequestException('Thiếu tiêu đề');
    if (!Number.isFinite(totalAmount) || totalAmount <= 0)
      throw new BadRequestException('Tổng phần thưởng phải > 0');
    if (!Number.isFinite(winnersCount) || winnersCount < 1)
      throw new BadRequestException('Số người thắng phải >= 1');
    if (winnersCount > totalAmount)
      throw new BadRequestException('Số người thắng không được lớn hơn tổng phần thưởng');

    const perWinner = Math.floor(totalAmount / winnersCount);

    let endsAt: Date | undefined;
    if (dto.endsAt) {
      const d = new Date(dto.endsAt);
      if (isNaN(d.getTime())) throw new BadRequestException('Thời gian kết thúc không hợp lệ');
      endsAt = d;
    }

    // Trừ tiền host trước
    await this.debitUser(hostId, rewardKind, totalAmount, `Tạo giveaway: ${dto.title}`);

    return this.prisma.giveaway.create({
      data: {
        hostId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        rewardKind,
        totalAmount,
        winnersCount,
        perWinner,
        mode,
        threadId: dto.threadId || null,
        status: 'OPEN',
        endsAt: endsAt ?? null,
      },
      include: { host: { select: USER_SELECT } },
    });
  }

  async list({ status, page = 1, limit = 20 }: { status?: string; page?: number; limit?: number }) {
    const where = status ? { status } : {};
    const take = Math.min(Math.max(Number(limit) || 20, 1), 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.giveaway.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          host: { select: USER_SELECT },
          _count: { select: { entries: true } },
        },
      }),
      this.prisma.giveaway.count({ where }),
    ]);

    return {
      data,
      meta: { total, page: Number(page) || 1, limit: take, totalPages: Math.ceil(total / take) },
    };
  }

  async get(id: string) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id },
      include: {
        host: { select: USER_SELECT },
        entries: {
          orderBy: { createdAt: 'asc' },
          include: { user: { select: USER_SELECT } },
        },
      },
    });
    if (!giveaway) throw new NotFoundException('Không tìm thấy giveaway');
    return giveaway;
  }

  async join(giveawayId: string, userId: string) {
    const giveaway = await this.prisma.giveaway.findUnique({ where: { id: giveawayId } });
    if (!giveaway) throw new NotFoundException('Không tìm thấy giveaway');
    if (giveaway.status !== 'OPEN') throw new BadRequestException('Giveaway đã đóng');
    if (giveaway.hostId === userId) throw new ForbiddenException('Bạn không thể tham gia giveaway của chính mình');
    if (giveaway.endsAt && giveaway.endsAt.getTime() < Date.now())
      throw new BadRequestException('Giveaway đã hết hạn');

    const existing = await this.prisma.giveawayEntry.findUnique({
      where: { giveawayId_userId: { giveawayId, userId } },
    });
    if (existing) throw new ConflictException('Bạn đã tham gia rồi');

    if (giveaway.mode === 'envelope') {
      // Lì xì: nhận thưởng ngay nếu còn suất
      const winnerCount = await this.prisma.giveawayEntry.count({
        where: { giveawayId, isWinner: true },
      });
      if (winnerCount >= giveaway.winnersCount)
        throw new BadRequestException('Đã hết lì xì');

      await this.creditUser(userId, giveaway.rewardKind, giveaway.perWinner, `Lì xì: ${giveaway.title}`, giveaway.id);

      const entry = await this.prisma.giveawayEntry.create({
        data: {
          giveawayId,
          userId,
          isWinner: true,
          amountWon: giveaway.perWinner,
        },
        include: { user: { select: USER_SELECT } },
      });

      // Hết suất -> chuyển DRAWN
      if (winnerCount + 1 >= giveaway.winnersCount) {
        await this.prisma.giveaway.update({
          where: { id: giveawayId },
          data: { status: 'DRAWN', drawnAt: new Date() },
        });
      }
      return entry;
    }

    // Raffle: chỉ ghi tên, quay sau
    return this.prisma.giveawayEntry.create({
      data: { giveawayId, userId, isWinner: false, amountWon: 0 },
      include: { user: { select: USER_SELECT } },
    });
  }

  async draw(giveawayId: string, actorId: string, actorRole?: UserRole) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: { entries: true },
    });
    if (!giveaway) throw new NotFoundException('Không tìm thấy giveaway');

    const isAdmin = actorRole === UserRole.ADMIN;
    if (giveaway.hostId !== actorId && !isAdmin)
      throw new ForbiddenException('Chỉ chủ giveaway hoặc admin mới được quay');
    if (giveaway.mode !== 'raffle') throw new BadRequestException('Chỉ rút thăm (raffle) mới quay được');
    if (giveaway.status !== 'OPEN') throw new BadRequestException('Giveaway đã được quay hoặc đã đóng');

    const entries = [...giveaway.entries];
    if (entries.length === 0) throw new BadRequestException('Chưa có ai tham gia');

    let winners: typeof entries;
    let everyoneWins = false;
    if (entries.length <= giveaway.winnersCount) {
      // Ít người hơn số suất -> mọi người thắng, hoàn phần dư cho host
      winners = entries;
      everyoneWins = true;
    } else {
      // Trộn Fisher-Yates rồi chọn winnersCount đầu
      for (let i = entries.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [entries[i], entries[j]] = [entries[j], entries[i]];
      }
      winners = entries.slice(0, giveaway.winnersCount);
    }

    for (const w of winners) {
      await this.creditUser(w.userId, giveaway.rewardKind, giveaway.perWinner, `Trúng thưởng: ${giveaway.title}`, giveaway.id);
      await this.prisma.giveawayEntry.update({
        where: { id: w.id },
        data: { isWinner: true, amountWon: giveaway.perWinner },
      });
    }

    // Hoàn phần dư cho host (luôn có nếu totalAmount > perWinner*winnersThực)
    const distributed = winners.length * giveaway.perWinner;
    const refund = giveaway.totalAmount - distributed;
    if (refund > 0) {
      await this.creditUser(giveaway.hostId, giveaway.rewardKind, refund, `Hoàn phần dư giveaway: ${giveaway.title}`, giveaway.id);
    }

    await this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: { status: 'DRAWN', drawnAt: new Date() },
    });

    return {
      everyoneWins,
      refund,
      winners: await this.prisma.giveawayEntry.findMany({
        where: { giveawayId, isWinner: true },
        include: { user: { select: USER_SELECT } },
      }),
    };
  }

  async cancel(giveawayId: string, actorId: string, actorRole?: UserRole) {
    const giveaway = await this.prisma.giveaway.findUnique({
      where: { id: giveawayId },
      include: { entries: true },
    });
    if (!giveaway) throw new NotFoundException('Không tìm thấy giveaway');

    const isAdmin = actorRole === UserRole.ADMIN;
    if (giveaway.hostId !== actorId && !isAdmin)
      throw new ForbiddenException('Chỉ chủ giveaway hoặc admin mới được hủy');
    if (giveaway.status !== 'OPEN') throw new BadRequestException('Chỉ hủy được giveaway đang mở');
    if (giveaway.mode !== 'raffle') throw new BadRequestException('Chỉ hủy được giveaway dạng rút thăm');

    const hasWinners = giveaway.entries.some((e) => e.isWinner);
    if (hasWinners) throw new BadRequestException('Đã có người thắng, không thể hủy');

    // Raffle chưa quay -> chưa phát thưởng, hoàn toàn bộ totalAmount
    const distributed = giveaway.entries.reduce((s, e) => s + (e.amountWon || 0), 0);
    const refund = giveaway.totalAmount - distributed;
    if (refund > 0) {
      await this.creditUser(giveaway.hostId, giveaway.rewardKind, refund, `Hoàn tiền hủy giveaway: ${giveaway.title}`, giveaway.id);
    }

    return this.prisma.giveaway.update({
      where: { id: giveawayId },
      data: { status: 'CLOSED' },
      include: { host: { select: USER_SELECT } },
    });
  }
}
