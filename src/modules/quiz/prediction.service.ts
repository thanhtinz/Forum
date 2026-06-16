import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CharacterService } from '../game/character/character.service';

export interface CreatePredictionDto {
  title: string;
  description?: string;
  options: string[];
  closesAt?: string | null;
}

@Injectable()
export class PredictionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
  ) {}

  private optionTotals(options: string[], bets: { optionIndex: number; amount: number }[]) {
    const totals = options.map(() => 0);
    let pool = 0;
    for (const b of bets) {
      if (b.optionIndex >= 0 && b.optionIndex < totals.length) totals[b.optionIndex] += b.amount;
      pool += b.amount;
    }
    return { totals, pool };
  }

  async list({ status }: { status?: string } = {}) {
    const where =
      status && ['OPEN', 'LOCKED', 'SETTLED'].includes(status)
        ? { status }
        : {};
    const preds = await this.prisma.prediction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { bets: { select: { optionIndex: true, amount: true } } },
    });
    return preds.map((p) => {
      const options = p.options as string[];
      const { totals, pool } = this.optionTotals(options, p.bets);
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        options,
        status: p.status,
        correctIndex: p.correctIndex,
        closesAt: p.closesAt,
        createdAt: p.createdAt,
        settledAt: p.settledAt,
        optionTotals: totals,
        pool,
        betCount: p.bets.length,
      };
    });
  }

  async get(id: string, userId?: string) {
    const p = await this.prisma.prediction.findUnique({
      where: { id },
      include: { bets: { select: { optionIndex: true, amount: true } } },
    });
    if (!p) throw new NotFoundException('Dự đoán không tồn tại');
    const options = p.options as string[];
    const { totals, pool } = this.optionTotals(options, p.bets);

    let myBet:
      | { optionIndex: number; amount: number; payout: number }
      | null = null;
    if (userId) {
      const b = await this.prisma.predictionBet.findUnique({
        where: { predictionId_userId: { predictionId: id, userId } },
      });
      if (b) myBet = { optionIndex: b.optionIndex, amount: b.amount, payout: b.payout };
    }

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      options,
      status: p.status,
      correctIndex: p.correctIndex,
      closesAt: p.closesAt,
      createdAt: p.createdAt,
      settledAt: p.settledAt,
      optionTotals: totals,
      pool,
      betCount: p.bets.length,
      myBet,
    };
  }

  async bet(userId: string, predictionId: string, optionIndex: number, amount: number) {
    const p = await this.prisma.prediction.findUnique({ where: { id: predictionId } });
    if (!p) throw new NotFoundException('Dự đoán không tồn tại');
    if (p.status !== 'OPEN') throw new BadRequestException('Dự đoán đã đóng');
    if (p.closesAt && p.closesAt.getTime() <= Date.now())
      throw new BadRequestException('Đã hết hạn đặt cược');

    const options = p.options as string[];
    if (
      typeof optionIndex !== 'number' ||
      optionIndex < 0 ||
      optionIndex >= options.length
    ) {
      throw new BadRequestException('Lựa chọn không hợp lệ');
    }
    amount = Math.round(Number(amount) || 0);
    if (amount <= 0) throw new BadRequestException('Số coin phải lớn hơn 0');

    const existing = await this.prisma.predictionBet.findUnique({
      where: { predictionId_userId: { predictionId, userId } },
    });
    if (existing) throw new ConflictException('Bạn đã đặt dự đoán này rồi');

    // Trừ coin (ném BadRequestException nếu không đủ)
    try {
      await this.character.adjustCoinByUser(
        userId,
        'prediction_bet',
        -amount,
        'Đặt dự đoán',
        predictionId,
      );
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Không đủ coin');
    }

    const created = await this.prisma.predictionBet.create({
      data: { predictionId, userId, optionIndex, amount },
    });
    return { ok: true, bet: { optionIndex: created.optionIndex, amount: created.amount } };
  }

  // ── Admin ──
  create(dto: CreatePredictionDto, createdBy: string) {
    const options = (dto.options || []).map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 2) throw new BadRequestException('Cần ít nhất 2 lựa chọn');
    const title = String(dto.title || '').trim();
    if (!title) throw new BadRequestException('Thiếu tiêu đề');
    return this.prisma.prediction.create({
      data: {
        title,
        description: dto.description?.trim() || null,
        options,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        status: 'OPEN',
        createdBy,
      },
    });
  }

  async lock(id: string) {
    const p = await this.prisma.prediction.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Dự đoán không tồn tại');
    if (p.status === 'SETTLED') throw new BadRequestException('Đã chốt kết quả');
    return this.prisma.prediction.update({ where: { id }, data: { status: 'LOCKED' } });
  }

  async settle(id: string, correctIndex: number) {
    const p = await this.prisma.prediction.findUnique({
      where: { id },
      include: { bets: true },
    });
    if (!p) throw new NotFoundException('Dự đoán không tồn tại');
    if (p.status === 'SETTLED') throw new BadRequestException('Đã chốt kết quả rồi');

    const options = p.options as string[];
    if (
      typeof correctIndex !== 'number' ||
      correctIndex < 0 ||
      correctIndex >= options.length
    ) {
      throw new BadRequestException('correctIndex không hợp lệ');
    }

    const totalPool = p.bets.reduce((s, b) => s + b.amount, 0);
    const winners = p.bets.filter((b) => b.optionIndex === correctIndex);
    const winnersStake = winners.reduce((s, b) => s + b.amount, 0);

    // Pari-mutuel payout
    const payouts = new Map<string, number>();
    if (winnersStake === 0) {
      // Không ai đoán đúng → hoàn lại tiền cho tất cả
      for (const b of p.bets) payouts.set(b.id, b.amount);
    } else {
      for (const b of winners) {
        payouts.set(b.id, Math.round((b.amount / winnersStake) * totalPool));
      }
    }

    // Cộng coin + lưu payout trên từng bet
    for (const b of p.bets) {
      const payout = payouts.get(b.id) ?? 0;
      if (payout > 0) {
        const note = winnersStake === 0 ? 'Hoàn coin dự đoán' : 'Thắng dự đoán';
        await this.character.adjustCoinByUser(b.userId, 'prediction_win', payout, note, p.id);
      }
      await this.prisma.predictionBet.update({
        where: { id: b.id },
        data: { payout },
      });
    }

    return this.prisma.prediction.update({
      where: { id },
      data: { status: 'SETTLED', correctIndex, settledAt: new Date() },
    });
  }

  async delete(id: string) {
    const p = await this.prisma.prediction.findUnique({
      where: { id },
      include: { bets: true },
    });
    if (!p) throw new NotFoundException('Dự đoán không tồn tại');

    // Hoàn coin cho các bet nếu chưa chốt
    if (p.status !== 'SETTLED') {
      for (const b of p.bets) {
        if (b.amount > 0) {
          await this.character.adjustCoinByUser(
            b.userId,
            'prediction_refund',
            b.amount,
            'Hoàn coin (huỷ dự đoán)',
            p.id,
          );
        }
      }
    }
    await this.prisma.predictionBet.deleteMany({ where: { predictionId: id } });
    await this.prisma.prediction.delete({ where: { id } });
    return { ok: true };
  }
}
