import { db } from './db';
import { SHOP_PAGE_SIZE, type Cosmetics, type ShopItemView, type ShopKind } from './shop-const';

export * from './shop-const';

/**
 * Những cột cần lấy kèm mỗi khi hiển thị một người dùng có trang trí.
 *
 * Để chung một chỗ vì nó phải đi kèm ở rất nhiều truy vấn; sửa rời rạc từng
 * nơi là chắc chắn có chỗ quên, rồi món đồ mua rồi mà chỗ đó không hiện.
 */
export const cosmeticSelect = {
  nameColor: { select: { value: true } },
  avatarFrame: { select: { value: true } },
  shopBadge: { select: { value: true, name: true } },
} as const;

/** Hàng người dùng đã lấy kèm `cosmeticSelect` — đổi thành bộ trang trí gọn. */
export function toCosmetics(u: {
  nameColor?: { value: string } | null;
  avatarFrame?: { value: string } | null;
  shopBadge?: { value: string; name: string } | null;
} | null | undefined): Cosmetics {
  return {
    nameColor: u?.nameColor?.value ?? null,
    avatarFrame: u?.avatarFrame?.value ?? null,
    badge: u?.shopBadge?.value ?? null,
    badgeName: u?.shopBadge?.name ?? null,
  };
}

/** Bộ trang trí của một người, hỏi thẳng khi chỗ gọi chưa lấy kèm sẵn. */
export async function getCosmetics(userId: string): Promise<Cosmetics> {
  const u = await db.user.findUnique({ where: { id: userId }, select: cosmeticSelect });
  return toCosmetics(u);
}

const itemSelect = {
  id: true, slug: true, kind: true, name: true, description: true,
  value: true, pricePoints: true, active: true, order: true,
} as const;

/**
 * Một trang quầy hàng.
 *
 * Món đã ngừng bán vẫn hiện với người ĐÃ MUA nó (để họ còn đeo/gỡ), nhưng
 * không hiện với người chưa mua — quầy không mời mua thứ không bán nữa.
 */
export async function getShopItems(opts: {
  viewerId: string | null;
  kind?: ShopKind | 'ALL';
  page?: number;
}): Promise<{ items: ShopItemView[]; total: number; totalPages: number }> {
  const { viewerId, kind = 'ALL' } = opts;
  const page = Math.max(1, opts.page ?? 1);
  const where = { active: true, ...(kind === 'ALL' ? {} : { kind }) };

  const [total, rows, me] = await Promise.all([
    db.shopItem.count({ where }),
    db.shopItem.findMany({
      where,
      orderBy: [{ kind: 'asc' }, { order: 'asc' }, { pricePoints: 'asc' }],
      skip: (page - 1) * SHOP_PAGE_SIZE,
      take: SHOP_PAGE_SIZE,
      select: {
        ...itemSelect,
        // Chỉ hỏi lượt mua của CHÍNH người đang xem, không kéo cả danh sách
        // người mua về rồi mới tìm trong đó.
        purchases: viewerId ? { where: { userId: viewerId }, select: { id: true }, take: 1 } : false,
      },
    }),
    viewerId
      ? db.user.findUnique({
          where: { id: viewerId },
          select: { nameColorId: true, avatarFrameId: true, shopBadgeId: true },
        })
      : Promise.resolve(null),
  ]);

  const equippedIds = new Set(
    [me?.nameColorId, me?.avatarFrameId, me?.shopBadgeId].filter((x): x is string => !!x),
  );

  return {
    total,
    totalPages: Math.ceil(total / SHOP_PAGE_SIZE),
    items: rows.map((r) => ({
      id: r.id, slug: r.slug, kind: r.kind, name: r.name, description: r.description,
      value: r.value, pricePoints: r.pricePoints, active: r.active, order: r.order,
      owned: Array.isArray(r.purchases) && r.purchases.length > 0,
      equipped: equippedIds.has(r.id),
    })),
  };
}

/** Kho đồ của một người: mọi món đã mua, kể cả món đã ngừng bán. */
export async function getMyItems(userId: string, page = 1): Promise<{
  items: ShopItemView[]; total: number; totalPages: number;
}> {
  const where = { userId };
  const [total, rows, me] = await Promise.all([
    db.shopPurchase.count({ where }),
    db.shopPurchase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Math.max(1, page) - 1) * SHOP_PAGE_SIZE,
      take: SHOP_PAGE_SIZE,
      select: { item: { select: itemSelect } },
    }),
    db.user.findUnique({
      where: { id: userId },
      select: { nameColorId: true, avatarFrameId: true, shopBadgeId: true },
    }),
  ]);

  const equippedIds = new Set(
    [me?.nameColorId, me?.avatarFrameId, me?.shopBadgeId].filter((x): x is string => !!x),
  );

  return {
    total,
    totalPages: Math.ceil(total / SHOP_PAGE_SIZE),
    items: rows.map((r) => ({ ...r.item, owned: true, equipped: equippedIds.has(r.item.id) })),
  };
}

/** Cột trên User ứng với từng loại đồ. */
export const EQUIP_FIELD: Record<ShopKind, 'nameColorId' | 'avatarFrameId' | 'shopBadgeId'> = {
  NAME_COLOR: 'nameColorId',
  AVATAR_FRAME: 'avatarFrameId',
  BADGE: 'shopBadgeId',
};
