import Link from 'next/link';
import type { Metadata } from 'next';
import { Backpack, ShoppingBag } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Pagination } from '@/components/Pagination';
import { ShopItemCard } from '@/components/user/ShopItemCard';
import { getShopItems, isShopKind, KIND_LABELS, SHOP_KINDS, type ShopKind } from '@/lib/shop';
import { fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Cửa hàng',
  description: 'Dùng điểm kiếm được trên diễn đàn để mua màu tên, khung avatar và huy hiệu.',
};

const TABS: { key: ShopKind | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  ...SHOP_KINDS.map((k) => ({ key: k, label: KIND_LABELS[k].label })),
];

export default async function ShopPage({ searchParams }: {
  searchParams: Promise<{ loai?: string; page?: string }>;
}) {
  const { loai, page: pageRaw } = await searchParams;
  const kind = loai && isShopKind(loai) ? loai : 'ALL';
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const [{ items, total, totalPages }, me] = await Promise.all([
    getShopItems({ viewerId, kind, page }),
    viewerId
      ? db.user.findUnique({ where: { id: viewerId }, select: { points: true } })
      : Promise.resolve(null),
  ]);

  const href = (k: ShopKind | 'ALL') => (k === 'ALL' ? '/cua-hang' : `/cua-hang?loai=${k}`);

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
        {TABS.map((t) => (
          <Link key={t.key} href={href(t.key)}
            className={`chip ${t.key === kind
              ? 'bg-brand-500 text-white'
              : 'bg-ink-100 text-ink-600 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            {t.label}
          </Link>
        ))}
      </nav>

      {kind !== 'ALL' && (
        <p className="retro-sub mt-2 text-ink-400">{KIND_LABELS[kind].hint}</p>
      )}

      {items.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-sm text-ink-400">
          Quầy chưa có món nào ở mục này.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <ShopItemCard key={it.id} item={it} myPoints={me?.points} loggedIn={!!viewerId} />
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages}
        basePath={kind === 'ALL' ? '/cua-hang' : `/cua-hang?loai=${kind}`} />

      {total > 0 && <p className="retro-sub mt-3 text-center text-ink-400">{fmtCount(total)} món</p>}
    </div>
  );
}
