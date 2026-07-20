import type { Prisma, PointsReason } from '@prisma/client';
import { db } from './db';

export interface GrantPointsInput {
  userId: string;
  amount: number; // dương = cộng, âm = trừ
  reason: PointsReason;
  refId?: string | null;
  note?: string | null;
  allowNegative?: boolean; // cho phép số dư điểm âm (mặc định: không)
}

export class InsufficientPointsError extends Error {
  constructor(message = 'Không đủ điểm') {
    super(message);
    this.name = 'InsufficientPointsError';
  }
}

/**
 * Mọi thay đổi điểm ĐỀU đi qua đây. Chạy trong transaction, cập nhật
 * User.points bằng phép increment (không đọc-rồi-ghi) và ghi PointsLog
 * kèm số dư SAU giao dịch để đối soát. Từ chối nếu kết quả âm.
 *
 * Có thể truyền `tx` để gộp vào một transaction lớn hơn (vd. mua nội dung).
 */
export async function grantPoints(
  input: GrantPointsInput,
  tx?: Prisma.TransactionClient,
): Promise<{ balance: number }> {
  const { userId, amount, reason, refId = null, note = null, allowNegative = false } = input;

  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new Error('amount phải là số nguyên hợp lệ');
  }
  if (amount === 0) {
    const u = await (tx ?? db).user.findUnique({ where: { id: userId }, select: { points: true } });
    return { balance: u?.points ?? 0 };
  }

  const run = async (client: Prisma.TransactionClient) => {
    // Trừ điểm: dùng updateMany có điều kiện để đảm bảo nguyên tử, chống race.
    if (amount < 0 && !allowNegative) {
      const need = -amount;
      const res = await client.user.updateMany({
        where: { id: userId, points: { gte: need } },
        data: { points: { decrement: need } },
      });
      if (res.count === 0) throw new InsufficientPointsError();
    } else {
      await client.user.update({
        where: { id: userId },
        data: { points: { increment: amount } },
      });
    }

    const user = await client.user.findUniqueOrThrow({
      where: { id: userId },
      select: { points: true },
    });

    await client.pointsLog.create({
      data: { userId, amount, balance: user.points, reason, refId, note },
    });

    return { balance: user.points };
  };

  return tx ? run(tx) : db.$transaction(run);
}
