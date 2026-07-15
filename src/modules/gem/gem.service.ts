import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GemTxType } from '@prisma/client';

@Injectable()
export class GemService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    let wallet = await this.prisma.gemWallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await this.prisma.gemWallet.create({ data: { userId } });
    }
    return wallet;
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { gemBalance: true },
    });
    return user?.gemBalance ?? 0;
  }

  async getTransactions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.gemTransaction.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.gemTransaction.count({ where: { userId } }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ──────────────────────────────────────────────
  // CREDIT (nạp gem) - dùng bởi payment webhook
  // ──────────────────────────────────────────────
  async credit(userId: string, amount: number, type: GemTxType, refId?: string, note?: string) {
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Số gem phải > 0');
    const amt = Math.floor(amount);

    return this.prisma.$transaction(async (tx) => {
      // Cộng gem atomic ({ increment }) để không mất gem khi có nhiều giao dịch đồng thời.
      // update trả về giá trị sau khi cộng → dùng làm balanceAfter chính xác.
      let updated;
      try {
        updated = await tx.user.update({
          where: { id: userId },
          data: { gemBalance: { increment: amt } },
          select: { gemBalance: true },
        });
      } catch {
        throw new NotFoundException('User không tồn tại');
      }
      const balanceAfter = updated.gemBalance;
      const balanceBefore = balanceAfter - amt;

      await tx.gemWallet.upsert({
        where: { userId },
        update: {
          balance: balanceAfter,
          totalTopup: type.startsWith('TOPUP') ? { increment: amt } : undefined,
          totalEarned: type === 'EARN_SELL' ? { increment: amt } : undefined,
        },
        create: { userId, balance: balanceAfter },
      });

      const transaction = await tx.gemTransaction.create({
        data: {
          userId, type, amount: amt, balanceBefore, balanceAfter,
          refId, refType: refId ? type : undefined, note,
        },
      });

      return { balanceAfter, transaction };
    });
  }

  // ──────────────────────────────────────────────
  // DEBIT (trừ gem) - dùng khi mua product/unlock
  // ──────────────────────────────────────────────
  async debit(userId: string, amount: number, type: GemTxType, refId?: string, note?: string) {
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('Số gem phải > 0');
    const amt = Math.floor(amount);

    return this.prisma.$transaction(async (tx) => {
      // Trừ gem atomic + có điều kiện: chỉ trừ khi số dư đủ (gemBalance >= amt).
      // UPDATE khoá row nên nhiều request đồng thời không thể double-spend / xuống âm.
      const res = await tx.user.updateMany({
        where: { id: userId, gemBalance: { gte: amt } },
        data: { gemBalance: { decrement: amt } },
      });
      if (res.count === 0) {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { gemBalance: true } });
        if (!user) throw new NotFoundException('User không tồn tại');
        throw new BadRequestException(`Không đủ Gem. Cần ${amt}, có ${user.gemBalance}`);
      }

      const user = await tx.user.findUnique({ where: { id: userId }, select: { gemBalance: true } });
      const balanceAfter = user!.gemBalance;
      const balanceBefore = balanceAfter + amt;

      await tx.gemWallet.update({
        where: { userId },
        data: { balance: balanceAfter, totalSpent: { increment: amt } },
      });

      const transaction = await tx.gemTransaction.create({
        data: {
          userId, type, amount: -amt, balanceBefore, balanceAfter,
          refId, refType: refId ? type : undefined, note,
        },
      });

      return { balanceAfter, transaction };
    });
  }

  // ──────────────────────────────────────────────
  // GEM PACKAGES (admin config)
  // ──────────────────────────────────────────────
  async getPackages() {
    return this.prisma.gemPackage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
