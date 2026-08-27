import Link from 'next/link';
import type { Metadata } from 'next';
import { Backpack, ShoppingBag } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Pagination } from '@/components/Pagination';
import { ShopItemCard } from '@/components/user/ShopItemCard';
import { cosmeticSelect, getShopItems, isShopKind, toCosmetics, KIND_LABELS, SHOP_KINDS, type ShopKind } from '@/lib/shop';
import type { ShopViewer } from '@/components/user/ShopItemCard';
import { fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Cửa hàng',
  description: 'Dùng điểm kiếm được trên diễn đàn để mua màu tên, khung avatar và huy hiệu.',
};

/**
 * Mỗi loại đồ một quầy riêng, không có mục "tất cả".
 *
 * Ba loại này xem theo cách khác hẳn nhau — màu tên là chữ, khung là ảnh phủ
 * lên avatar, huy hiệu là ảnh nhỏ — nên trộn chung một danh sách thì mắt
 * không so được món nào với món nào.
 */
export default async function ShopPage({ searchParams }: {
  searchParams: Promise<{ loai?: string; page?: string }>;
}) {
  const { loai, page: pageRaw } = await searchParams;
  const kind: ShopKind = loai && isShopKind(loai) ? loai : SHOP_KINDS[0];
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const [{ items, total, totalPages }, me] = await Promise.all([
    getShopItems({ viewerId, kind, page }),
    viewerId
      // Lấy kèm tên, avatar và đồ đang đeo: ô xem trước dựng món đồ lên chính
      // hồ sơ người đang xem chứ không phải một hình mẫu chung chung.
      ? db.user.findUnique({
          where: { id: viewerId },
          select: { points: true, name: true, username: true, image: true, role: true, level: true, ...cosmeticSelect },
        })
      : Promise.resolve(null),
  ]);

  const href = (k: ShopKind) => `/cua-hang?loai=${k}`;
  const viewer: ShopViewer | undefined = me
    ? { name: me.name, username: me.username, image: me.image, role: me.role, level: me.level, cosmetics: toCosmetics(me) }
    : undefined;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <ShoppingBag size={22} /> Cửa hàng
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Mua bằng điểm kiếm được trên diễn đàn. Mua một lần là của mãi mãi, đeo hay gỡ tuỳ bạn.
          </p>
        </div>

        {/* Số điểm nằm trên thanh đầu trang, không nhắc lại ở đây. */}
        {viewerId && (
          <Link href="/user/items" className="btn-outline !py-1.5 text-sm">
            <Backpack size={15} /> Kho đồ của tôi
          </Link>
        )}
      </div>

      <nav className="mt-4 flex flex-wrap gap-1.5">
        {SHOP_KINDS.map((k) => (
          <Link key={k} href={href(k)}
            className={`chip ${k === kind
              ? 'bg-brand-500 text-white'
              : 'bg-ink-100 text-ink-600 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            {KIND_LABELS[k].label}
          </Link>
        ))}
      </nav>

      <p className="retro-sub mt-2 text-ink-400">{KIND_LABELS[kind].hint}</p>

      {items.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-sm text-ink-400">
          Quầy chưa có {KIND_LABELS[kind].one} nào.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <ShopItemCard key={it.id} item={it} myPoints={me?.points} loggedIn={!!viewerId}
              viewer={viewer} showKind={false} />
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} basePath={href(kind)} />

      {total > 0 && <p className="retro-sub mt-3 text-center text-ink-400">{fmtCount(total)} món</p>}
    </div>
  );
}
