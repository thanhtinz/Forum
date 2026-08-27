'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { grantPoints, InsufficientPointsError } from '@/lib/points';
import { EQUIP_FIELD } from '@/lib/shop';

export interface ShopState {
  ok?: boolean;
  error?: string;
  /** Số điểm còn lại sau khi mua, để quầy cập nhật ngay. */
  left?: number;
}

function refresh() {
  revalidatePath('/cua-hang');
  revalidatePath('/user/items');
}

/**
 * Mua một món đồ trang trí bằng điểm.
 *
 * Trừ điểm và ghi sổ sở hữu trong CÙNG một giao dịch: tách ra thì chỉ cần một
 * lần lỗi là có người mất điểm mà không có đồ, hoặc có đồ mà không mất điểm.
 */
export async function buyShopItem(itemId: string): Promise<ShopState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập để mua.' };

  const item = await db.shopItem.findFirst({
    where: { id: itemId, active: true },
    select: { id: true, name: true, pricePoints: true },
  });
  if (!item) return { error: 'Món này không còn bán.' };

  const owned = await db.shopPurchase.findUnique({
    where: { userId_itemId: { userId, itemId: item.id } },
    select: { id: true },
  });
  if (owned) return { error: 'Bạn đã có món này rồi.' };

  try {
    const { balance } = await db.$transaction(async (tx) => {
      const r = await grantPoints({
        userId, amount: -item.pricePoints, reason: 'SHOP_BUY', refId: item.id,
        note: `Mua ${item.name}`,
      }, tx);
      await tx.shopPurchase.create({
        data: { userId, itemId: item.id, pointsPaid: item.pricePoints },
        select: { id: true },
      });
      return r;
    });

    refresh();
    return { ok: true, left: balance };
  } catch (e) {
    if (e instanceof InsufficientPointsError) {
      return { error: `Bạn không đủ điểm — món này giá ${item.pricePoints} điểm.` };
    }
    // Hai tab cùng bấm mua: lượt sau vướng ràng buộc duy nhất, coi như đã có.
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code?: string }).code === 'P2002') {
      return { error: 'Bạn đã có món này rồi.' };
    }
    throw e;
  }
}

/**
 * Đeo một món đã mua. Mỗi loại chỉ đeo được một món, nên đeo món mới là món
 * cũ cùng loại tự rời ra.
 */
export async function equipShopItem(itemId: string): Promise<ShopState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  // Phải sở hữu mới đeo được — nếu không thì ai gửi id món bất kỳ cũng đeo
  // được món chưa mua.
  const purchase = await db.shopPurchase.findUnique({
    where: { userId_itemId: { userId, itemId } },
    select: { item: { select: { id: true, kind: true } } },
  });
  if (!purchase) return { error: 'Bạn chưa có món này.' };

  await db.user.update({
    where: { id: userId },
    data: { [EQUIP_FIELD[purchase.item.kind]]: purchase.item.id },
    select: { id: true },
  });

  refresh();
  return { ok: true };
}

/** Gỡ món đang đeo của một loại. */
export async function unequipShopItem(itemId: string): Promise<ShopState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Bạn cần đăng nhập.' };

  const item = await db.shopItem.findUnique({ where: { id: itemId }, select: { kind: true } });
  if (!item) return { error: 'Món này không còn.' };

  // updateMany kèm điều kiện đang đeo đúng món đó: bấm gỡ hai lần, hoặc gỡ
  // món mình không đeo, đều không đụng tới món đang đeo thật.
  await db.user.updateMany({
    where: { id: userId, [EQUIP_FIELD[item.kind]]: itemId },
    data: { [EQUIP_FIELD[item.kind]]: null },
  });

  refresh();
  return { ok: true };
}
