import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { notify } from './notify';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

export interface LevelLook {
  level: number;
  /** Tên bậc — cũng chính là DANH HIỆU hiện cạnh tên. */
  name: string;
  color: string | null;
}

/**
 * Bảng tra cấp -> giao diện huy hiệu (tên, biểu tượng, màu).
 * Cache theo request nên nhiều component cùng dùng chỉ tốn một truy vấn.
 */
export const getLevelLooks = cache(async (): Promise<Map<number, LevelLook>> => {
  const rules = await db.levelRule.findMany({ take: CONFIG_LIST_CAP,
    select: { level: true, name: true, color: true },
  });
  return new Map(rules.map((r) => [r.level, r]));
});

/** Giao diện huy hiệu của một cấp; null nếu admin chưa cấu hình cấp đó. */
export async function getLevelLook(level: number): Promise<LevelLook | null> {
  return (await getLevelLooks()).get(level) ?? null;
}

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
      // Chép luôn tên bậc lên hàng người dùng: danh hiệu cạnh tên đọc từ đó,
      // để hơn hai mươi chỗ hiện tên không phải tự tra bảng cấp.
      await client.user.update({
        where: { id: userId },
        data: { level: rule.level, levelTitle: rule.name },
      });
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
