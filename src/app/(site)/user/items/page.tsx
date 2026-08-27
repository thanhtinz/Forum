import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Backpack, Coins, ShoppingBag } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Pagination } from '@/components/Pagination';
import { ShopItemCard } from '@/components/user/ShopItemCard';
import { getMyItems } from '@/lib/shop';
import { fmtCount } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Kho đồ của tôi' };

export default async function MyItemsPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/items');
  const userId = session.user.id;

  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const [{ items, total, totalPages }, me] = await Promise.all([
    getMyItems(userId, page),
    db.user.findUnique({ where: { id: userId }, select: { points: true } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
            <Backpack size={22} /> Kho đồ của tôi
            {total > 0 && <span className="retro-count">{fmtCount(total)}</span>}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            Mỗi loại đeo được một món. Đeo món mới thì món cũ cùng loại tự rời ra.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="chip gap-1.5 bg-amber-100 text-amber-700 dark:bg-amber-950/50">
            <Coins size={14} /> {fmtCount(me?.points ?? 0)} điểm
          </span>
          <Link href="/cua-hang" className="btn-outline !py-1.5 text-sm">
            <ShoppingBag size={15} /> Ra cửa hàng
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-sm text-ink-400">
          Kho còn trống.{' '}
          <Link href="/cua-hang" className="font-semibold text-brand-600 hover:underline">Ghé cửa hàng</Link>{' '}
          xem có gì hợp không.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <ShopItemCard key={it.id} item={it} myPoints={me?.points} loggedIn />
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} basePath="/user/items" />
    </div>
  );
}
