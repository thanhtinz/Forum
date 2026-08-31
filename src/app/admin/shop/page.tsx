import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/admin';
import { Pagination } from '@/components/Pagination';
import { ShopManager } from '@/components/admin/ShopManager';
import { SHOP_PAGE_SIZE, type ShopItemView } from '@/lib/shop';
import { tinhSoTrang } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cửa hàng', robots: { index: false } };

export default async function AdminShopPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  // Cửa hàng là hàng của nền tảng: chỉ quản trị viên, không cho điều hành viên.
  await requireSuperAdmin();

  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [total, rows] = await Promise.all([
    db.shopItem.count(),
    db.shopItem.findMany({
      // Kể cả món đã ngừng bán: quản trị viên phải thấy để bật lại hoặc sửa.
      orderBy: [{ kind: 'asc' }, { order: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * SHOP_PAGE_SIZE,
      take: SHOP_PAGE_SIZE,
      select: {
        id: true, slug: true, kind: true, name: true, description: true,
        value: true, pricePoints: true, active: true, order: true,
      },
    }),
  ]);

  // `owned`/`equipped` chỉ có nghĩa với người mua; ở màn quản trị luôn là false.
  const items: ShopItemView[] = rows.map((r) => ({ ...r, owned: false, equipped: false }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Cửa hàng</h1>
        <p className="text-sm text-ink-500">
          Đồ trang trí bán bằng điểm: màu tên nhập giá trị CSS, huy hiệu thì tải ảnh lên. Avatar, ảnh bìa và danh hiệu KHÔNG bán — hai thứ đầu người dùng tự tải lên ở trang cài đặt, còn danh hiệu là tên bậc theo cấp, đặt ở mục Cấp bậc.
          Món đã có người mua thì tắt “đang bán” chứ đừng xoá — xoá là mất luôn đồ của họ.
        </p>
      </div>

      <ShopManager items={items} />

      <Pagination page={page} totalPages={tinhSoTrang(total, SHOP_PAGE_SIZE)} basePath="/admin/shop" />
    </div>
  );
}
