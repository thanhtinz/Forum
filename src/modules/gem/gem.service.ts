import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GemTxType } from '@prisma/client';
import { VipService } from '../vip/vip.service';

@Injectable()
export class GemService {
  constructor(private readonly prisma: PrismaService, private readonly vip: VipService) {}

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
    if (amount <= 0) throw new BadRequestException('Số gem phải > 0');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { gemBalance: true },
      });
      if (!user) throw new NotFoundException('User không tồn tại');

      const balanceBefore = user.gemBalance;
      const balanceAfter = balanceBefore + amount;

      await tx.user.update({
        where: { id: userId },
        data: { gemBalance: balanceAfter },
      });

      await tx.gemWallet.upsert({
        where: { userId },
        update: {
          balance: balanceAfter,
          totalTopup: type.startsWith('TOPUP') ? { increment: amount } : undefined,
          totalEarned: type === 'EARN_SELL' ? { increment: amount } : undefined,
        },
        create: { userId, balance: balanceAfter },
      });

      const transaction = await tx.gemTransaction.create({
        data: {
          userId, type, amount, balanceBefore, balanceAfter,
          refId, refType: refId ? type : undefined, note,
        },
      });

      return { balanceAfter, transaction };
    }).then(async (res) => {
      // Nạp gem → tính lại VIP (đạt mốc thì gắn badge + khung avatar)
      if (type.startsWith('TOPUP')) await this.vip.recompute(userId).catch(() => {});
      return res;
    });
  }

  // ──────────────────────────────────────────────
  // DEBIT (trừ gem) - dùng khi mua product/unlock
  // ──────────────────────────────────────────────
  async debit(userId: string, amount: number, type: GemTxType, refId?: string, note?: string) {
    if (amount <= 0) throw new BadRequestException('Số gem phải > 0');

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { gemBalance: true },
      });
      if (!user) throw new NotFoundException('User không tồn tại');
      if (user.gemBalance < amount)
        throw new BadRequestException(`Không đủ Gem. Cần ${amount}, có ${user.gemBalance}`);

      const balanceBefore = user.gemBalance;
      const balanceAfter = balanceBefore - amount;

      await tx.user.update({
        where: { id: userId },
        data: { gemBalance: balanceAfter },
      });

      await tx.gemWallet.update({
        where: { userId },
        data: { balance: balanceAfter, totalSpent: { increment: amount } },
      });

      const transaction = await tx.gemTransaction.create({
        data: {
          userId, type, amount: -amount, balanceBefore, balanceAfter,
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
