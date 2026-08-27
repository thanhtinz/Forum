import type { Prisma } from '@prisma/client';

/**
 * Điều kiện xác định một bài viết là "hàng" trong cửa hàng.
 *
 * Cửa hàng là hàng của nền tảng, chỉ ban quản trị đăng. Thành viên vẫn khoá
 * được nội dung ẩn của mình bằng điểm, nhưng bài đó là bài trên diễn đàn /
 * blog chứ không phải món hàng — nên lọc thêm theo vai trò tác giả, không
 * chỉ theo mức giá.
 */
export const SHOP_WHERE: Prisma.PostWhereInput = {
  status: 'PUBLISHED',
  access: { in: ['POINTS', 'PAID', 'VIP_ONLY'] },
  author: { role: 'ADMIN' },
};

export type ShopSort = 'new' | 'popular' | 'cheap' | 'expensive';

export const SHOP_SORTS: { key: ShopSort; label: string }[] = [
  { key: 'new', label: 'Mới nhất' },
  { key: 'popular', label: 'Xem nhiều' },
  { key: 'cheap', label: 'Giá thấp → cao' },
  { key: 'expensive', label: 'Giá cao → thấp' },
];

/** Thứ tự sắp xếp tương ứng cho Prisma. */
export function shopOrderBy(sort: ShopSort): Prisma.PostOrderByWithRelationInput[] {
  switch (sort) {
    case 'popular':
      return [{ viewCount: 'desc' }, { createdAt: 'desc' }];
    case 'cheap':
      return [{ priceAmount: { sort: 'asc', nulls: 'last' } }, { pricePoints: { sort: 'asc', nulls: 'last' } }];
    case 'expensive':
      return [{ priceAmount: { sort: 'desc', nulls: 'last' } }, { pricePoints: { sort: 'desc', nulls: 'last' } }];
    default:
      return [{ pinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }];
  }
}

/** Chuẩn hoá tham số sort từ query string. */
export function parseShopSort(raw?: string): ShopSort {
  return SHOP_SORTS.some((s) => s.key === raw) ? (raw as ShopSort) : 'new';
}
