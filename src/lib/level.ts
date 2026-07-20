import type { Prisma } from '@prisma/client';
import { db } from './db';
import { notify } from './notify';

/**
 * Cộng EXP cho người dùng rồi tra bảng LevelRule để nâng cấp.
 * LevelRule là cấu hình (không hardcode). Nâng cấp -> bắn Notification.
 * Gộp được vào transaction lớn hơn qua `tx`.
 */
export async function addExp(
  userId: string,
  amount: number,
  tx?: Prisma.TransactionClient,
): Promise<{ exp: number; level: number; leveledUp: boolean }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    const u = await (tx ?? db).user.findUniqueOrThrow({
      where: { id: userId },
      select: { exp: true, level: true },
    });
    return { exp: u.exp, level: u.level, leveledUp: false };
  }

  const run = async (client: Prisma.TransactionClient) => {
    await client.user.update({ where: { id: userId }, data: { exp: { increment: amount } } });
    const user = await client.user.findUniqueOrThrow({
      where: { id: userId },
      select: { exp: true, level: true },
    });

    // Cấp cao nhất mà exp hiện tại đạt được.
    const rule = await client.levelRule.findFirst({
      where: { expRequired: { lte: user.exp } },
      orderBy: { level: 'desc' },
    });

    let leveledUp = false;
    if (rule && rule.level > user.level) {
      await client.user.update({ where: { id: userId }, data: { level: rule.level } });
      await notify(
        {
          userId,
          type: 'SYSTEM',
          title: `Chúc mừng! Bạn đã lên cấp ${rule.level} — ${rule.name}`,
          link: '/user/dashboard',
        },
        client,
      );
      leveledUp = true;
      return { exp: user.exp, level: rule.level, leveledUp };
    }

    return { exp: user.exp, level: user.level, leveledUp };
  };

  return tx ? run(tx) : db.$transaction(run);
}
