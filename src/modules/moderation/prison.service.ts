import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Nhà tù (kiểu Avatar): mod/admin giam người chơi vi phạm trong 1 khoảng thời gian.
// Người bị giam có thể nộp tiền chuộc (coin) để ra sớm, hoặc chờ hết hạn.
@Injectable()
export class PrisonService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Giám thị (mod/admin) tống giam ──
  async jail(
    actorId: string,
    targetUsername: string,
    minutes: number,
    reason: string,
    bailCoin = 0,
  ) {
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60 * 24 * 30) {
      throw new BadRequestException('Thời gian giam không hợp lệ (1 phút - 30 ngày)');
    }
    if (!reason || reason.trim().length < 3) {
      throw new BadRequestException('Cần ghi lý do giam');
    }
    const target = await this.prisma.user.findUnique({
      where: { username: targetUsername },
      select: { id: true, role: true },
    });
    if (!target) throw new NotFoundException('Không tìm thấy người chơi');
    if (target.id === actorId) throw new BadRequestException('Không thể tự giam mình');
    if (target.role === 'ADMIN') throw new ForbiddenException('Không thể giam Admin');

    const active = await this.getActiveRecord(target.id);
    if (active) throw new BadRequestException('Người này đang bị giam rồi');

    const record = await this.prisma.prison.create({
      data: {
        userId: target.id,
        reason: reason.trim(),
        jailedById: actorId,
        releaseAt: new Date(Date.now() + minutes * 60 * 1000),
        bailCoin: Math.max(0, Math.floor(bailCoin)),
      },
    });
    return { ok: true, prisonId: record.id, releaseAt: record.releaseAt, bailCoin: record.bailCoin };
  }

  // ── Trạng thái của chính mình ──
  async myStatus(userId: string) {
    const record = await this.getActiveRecord(userId);
    if (!record) return { jailed: false };
    return {
      jailed: true,
      reason: record.reason,
      jailedAt: record.jailedAt,
      releaseAt: record.releaseAt,
      bailCoin: record.bailCoin,
      remainingSec: Math.max(0, Math.ceil((record.releaseAt.getTime() - Date.now()) / 1000)),
    };
  }

  // Helper cho module khác kiểm tra (vd: chặn đăng bài/chat khi đang bị giam)
  async isJailed(userId: string): Promise<boolean> {
    return !!(await this.getActiveRecord(userId));
  }

  // ── Nộp tiền chuộc bằng coin ──
  async bail(userId: string) {
    const record = await this.getActiveRecord(userId);
    if (!record) throw new BadRequestException('Bạn không bị giam');
    if (record.bailCoin <= 0) throw new BadRequestException('Án này không cho phép nộp tiền chuộc');

    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new BadRequestException('Cần nhân vật game để nộp coin chuộc');
    if (char.coinBalance < record.bailCoin) {
      throw new BadRequestException(`Không đủ coin. Cần ${record.bailCoin}`);
    }

    await this.prisma.$transaction(async (tx) => {
      const after = char.coinBalance - record.bailCoin;
      await tx.gameCharacter.update({ where: { id: char.id }, data: { coinBalance: after } });
      await tx.coinTransaction.create({
        data: {
          characterId: char.id,
          type: 'spend_bail',
          amount: -record.bailCoin,
          balanceBefore: char.coinBalance,
          balanceAfter: after,
          refId: record.id,
          note: 'Nộp tiền chuộc nhà tù',
        },
      });
      await tx.prison.update({
        where: { id: record.id },
        data: { released: true, releasedAt: new Date(), releaseType: 'BAIL' },
      });
    });
    return { ok: true, paid: record.bailCoin };
  }

  // ── Giám thị xem danh sách tù nhân ──
  async inmates(page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const where = { released: false, releaseAt: { gt: new Date() } };
    const [data, total] = await Promise.all([
      this.prisma.prison.findMany({
        where,
        skip,
        take: limit,
        orderBy: { releaseAt: 'asc' },
        include: { user: { select: { username: true, displayName: true } } },
      }),
      this.prisma.prison.count({ where }),
    ]);
    return {
      data: data.map((r) => ({
        id: r.id,
        username: r.user.username,
        displayName: r.user.displayName,
        reason: r.reason,
        jailedAt: r.jailedAt,
        releaseAt: r.releaseAt,
        bailCoin: r.bailCoin,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Giám thị ân xá (thả sớm) ──
  async pardon(prisonId: string) {
    const record = await this.prisma.prison.findUnique({ where: { id: prisonId } });
    if (!record || record.released) throw new NotFoundException('Không tìm thấy án đang thi hành');
    await this.prisma.prison.update({
      where: { id: prisonId },
      data: { released: true, releasedAt: new Date(), releaseType: 'PARDON' },
    });
    return { ok: true };
  }

  // Lấy án đang thi hành (chưa thả + chưa hết hạn). Tự đánh dấu SERVED nếu hết hạn.
  private async getActiveRecord(userId: string) {
    const record = await this.prisma.prison.findFirst({
      where: { userId, released: false },
      orderBy: { releaseAt: 'desc' },
    });
    if (!record) return null;
    if (record.releaseAt.getTime() <= Date.now()) {
      await this.prisma.prison.update({
        where: { id: record.id },
        data: { released: true, releasedAt: new Date(), releaseType: 'SERVED' },
      });
      return null;
    }
    return record;
  }
}
