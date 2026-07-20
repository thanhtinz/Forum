import type { Prisma, BalanceReason } from '@prisma/client';
import { db } from './db';

export interface GrantBalanceInput {
  userId: string;
  amount: number; // VND (đơn vị đồng); dương = cộng, âm = trừ
  reason: BalanceReason;
  refId?: string | null;
  note?: string | null;
  allowNegative?: boolean;
}

export class InsufficientBalanceError extends Error {
  constructor(message = 'Số dư không đủ') {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

/**
 * Thay đổi số dư (VND). Nguyên tử qua $transaction + increment/decrement.
 * Ghi BalanceLog kèm số dư sau giao dịch. Truyền `tx` để gộp transaction.
 */
export async function grantBalance(
  input: GrantBalanceInput,
  tx?: Prisma.TransactionClient,
): Promise<{ balance: number }> {
  const { userId, amount, reason, refId = null, note = null, allowNegative = false } = input;

  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new Error('amount phải là số nguyên hợp lệ');
  }
  if (amount === 0) {
    const u = await (tx ?? db).user.findUnique({ where: { id: userId }, select: { balance: true } });
    return { balance: u?.balance ?? 0 };
  }

  const run = async (client: Prisma.TransactionClient) => {
    if (amount < 0 && !allowNegative) {
      const need = -amount;
      const res = await client.user.updateMany({
        where: { id: userId, balance: { gte: need } },
        data: { balance: { decrement: need } },
      });
      if (res.count === 0) throw new InsufficientBalanceError();
    } else {
      await client.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } },
      });
    }

    const user = await client.user.findUniqueOrThrow({
      where: { id: userId },
      select: { balance: true },
    });

    await client.balanceLog.create({
      data: { userId, amount, balance: user.balance, reason, refId, note },
    });

    return { balance: user.balance };
  };

  return tx ? run(tx) : db.$transaction(run);
}
