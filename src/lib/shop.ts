import type { Prisma } from '@prisma/client';
import { db } from './db';
import { SHOP_PAGE_SIZE, type Cosmetics, type ShopItemView, type ShopKind } from './shop-const';
import { tinhSoTrang } from '@/lib/utils';

export * from './shop-const';

/**
 * Những cột cần lấy kèm mỗi khi hiển thị một người dùng có trang trí.
 *
 * Để chung một chỗ vì nó phải đi kèm ở rất nhiều truy vấn; sửa rời rạc từng
 * nơi là chắc chắn có chỗ quên, rồi món đồ mua rồi mà chỗ đó không hiện.
 */
/**
 * Câu lạc bộ đại diện — cái thẻ viết tắt đeo cạnh tên.
 *
 * Lấy MỘT nhóm: nhóm mình làm chủ trước (enum vai trò xếp OWNER đầu tiên),
 * không có thì nhóm vào sớm nhất. Cùng lối với huy chương: hỏi kèm luôn, khỏi
 * phải nối bảng ở từng trang.
 *
 * Tách ra biến riêng vì `cosmeticSelect` mang `as const` — mảng `orderBy` viết
 * thẳng trong đó thành mảng chỉ-đọc, mà Prisma chỉ nhận mảng ghi được.
 */
const clbDaiDien = {
  where: { status: 'ACTIVE', club: { shortName: { not: null } } },
  orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  take: 1,
  select: { club: { select: { shortName: true, slug: true, name: true } } },
} satisfies Prisma.User$clubMembershipsArgs;

export const cosmeticSelect = {
  nameColor: { select: { value: true } },
  shopBadge: { select: { value: true, name: true } },
  // Danh hiệu KHÔNG bán: nó là tên bậc của cấp, chép sẵn lên hàng người dùng
  // để đi cùng bộ trang trí tới mọi chỗ (xem `User.levelTitle`).
  levelTitle: true,
  // Huy chương đang bật hiển thị — chỉ lấy MỘT cái mới nhất: cạnh tên chỉ đủ
  // chỗ cho một huy hiệu nhận được, lấy hết về rồi bỏ đi là phí truy vấn.
  medals: {
    where: { displayed: true },
    orderBy: { grantedAt: 'desc' },
    take: 1,
    select: { medal: { select: { icon: true, name: true } } },
  },
  clubMemberships: clbDaiDien,
} as const;

/** Hàng người dùng đã lấy kèm `cosmeticSelect` — đổi thành bộ trang trí gọn. */
export function toCosmetics(u: {
  nameColor?: { value: string } | null;
  shopBadge?: { value: string; name: string } | null;
  levelTitle?: string | null;
  medals?: { medal: { icon: string; name: string } }[];
  clubMemberships?: { club: { shortName: string | null; slug: string; name: string } }[];
} | null | undefined): Cosmetics {
  const huyChuong = u?.medals?.[0]?.medal ?? null;
  const clb = u?.clubMemberships?.[0]?.club ?? null;
  return {
    nameColor: u?.nameColor?.value ?? null,
    badge: u?.shopBadge?.value ?? null,
    badgeName: u?.shopBadge?.name ?? null,
    medal: huyChuong?.icon ?? null,
    medalName: huyChuong?.name ?? null,
    title: u?.levelTitle ?? null,
    clubTag: clb?.shortName ?? null,
    clubSlug: clb?.slug ?? null,
    clubName: clb?.name ?? null,
  };
}

/** Bộ trang trí của một người, hỏi thẳng khi chỗ gọi chưa lấy kèm sẵn. */
export async function getCosmetics(userId: string): Promise<Cosmetics> {
  const u = await db.user.findUnique({ where: { id: userId }, select: cosmeticSelect });
  return toCosmetics(u);
}

/**
 * Cột cần lấy cho một "chip người dùng": avatar + tên + đồ trang trí.
 *
 * Gần như trang nào cũng in tên ai đó ra, và chỗ nào quên lấy kèm đồ trang trí
 * thì món đồ mua rồi lại không hiện — người mua chỉ thấy nó lúc lúc có lúc
 * không mà không hiểu vì sao. Một select dùng chung để không có chỗ nào lệch.
 */
export const authorChipSelect = {
  username: true, name: true, image: true, level: true, role: true,
  ...cosmeticSelect,
} as const;

export interface AuthorChip {
  username: string | null;
  name: string | null;
  image: string | null;
  level: number;
  role: string;
  cosmetics: Cosmetics;
}

/** Hàng người dùng lấy kèm `authorChipSelect` → chip gọn để truyền xuống giao diện. */
export function toAuthorChip(u: {
  username: string | null; name: string | null; image: string | null; level: number; role: string;
  nameColor?: { value: string } | null;
  shopBadge?: { value: string; name: string } | null;
  shopTitle?: { value: string } | null;
  medals?: { medal: { icon: string; name: string } }[];
} | null | undefined): AuthorChip | null {
  return u ? { username: u.username, name: u.name, image: u.image, level: u.level, role: u.role, cosmetics: toCosmetics(u) } : null;
}

const itemSelect = {
  id: true, slug: true, kind: true, name: true, description: true,
  value: true, pricePoints: true, active: true, order: true,
} as const;

/**
 * Một trang quầy hàng của MỘT loại đồ.
 *
 * Món đã ngừng bán không hiện ở quầy — quầy không mời mua thứ không bán nữa —
 * nhưng người đã mua vẫn thấy nó trong kho đồ để còn đeo/gỡ.
 */
export async function getShopItems(opts: {
  viewerId: string | null;
  kind: ShopKind;
  page?: number;
}): Promise<{ items: ShopItemView[]; total: number; totalPages: number }> {
  const { viewerId, kind } = opts;
  const page = Math.max(1, opts.page ?? 1);
  const where = { active: true, kind };

  const [total, rows, me] = await Promise.all([
    db.shopItem.count({ where }),
    db.shopItem.findMany({
      where,
      orderBy: [{ order: 'asc' }, { pricePoints: 'asc' }],
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
          select: { nameColorId: true, shopBadgeId: true },
        })
      : Promise.resolve(null),
  ]);

  const equippedIds = new Set(
    [me?.nameColorId, me?.shopBadgeId].filter((x): x is string => !!x),
  );

  return {
    total,
    totalPages: tinhSoTrang(total, SHOP_PAGE_SIZE),
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
      select: { nameColorId: true, shopBadgeId: true },
    }),
  ]);

  const equippedIds = new Set(
    [me?.nameColorId, me?.shopBadgeId].filter((x): x is string => !!x),
  );

  return {
    total,
    totalPages: tinhSoTrang(total, SHOP_PAGE_SIZE),
    items: rows.map((r) => ({ ...r.item, owned: true, equipped: equippedIds.has(r.item.id) })),
  };
}

/** Cột trên User ứng với từng loại đồ. */
export const EQUIP_FIELD: Record<ShopKind, 'nameColorId' | 'shopBadgeId'> = {
  NAME_COLOR: 'nameColorId',
  BADGE: 'shopBadgeId',
};
