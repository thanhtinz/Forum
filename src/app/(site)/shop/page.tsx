import Link from 'next/link';
import type { Metadata } from 'next';
import { ShoppingBag, Crown } from 'lucide-react';
import { db } from '@/lib/db';
import { postCardSelect, toCardData } from '@/lib/post-card';
import { SHOP_WHERE, shopOrderBy, parseShopSort } from '@/lib/shop';
import { PostGrid } from '@/components/PostGrid';
import { Pagination } from '@/components/Pagination';
import { ShopFilters, type ShopCategory } from '@/components/shop/ShopFilters';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;

export const metadata: Metadata = {
  title: 'Cửa hàng',
  description: 'Tài nguyên, tài liệu và khoá học trả phí trên Nova.',
};

export default async function ShopPage({ searchParams }: {
  searchParams: Promise<{ page?: string; cat?: string; sort?: string }>;
}) {
  const { page: pageRaw, cat, sort: sortRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const sort = parseShopSort(sortRaw);

  // Lọc theo chuyên mục (chuyên mục chính hoặc chuyên mục phụ)
  const where = cat
    ? { ...SHOP_WHERE, OR: [{ category: { slug: cat } }, { categories: { some: { category: { slug: cat } } } }] }
    : SHOP_WHERE;

  const [total, items, cats, vipCount] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({
      where,
      orderBy: shopOrderBy(sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: postCardSelect,
    }),
    db.category.findMany({
      where: { OR: [{ posts: { some: SHOP_WHERE } }, { postLinks: { some: { post: SHOP_WHERE } } }] },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { slug: true, name: true, _count: { select: { posts: true, postLinks: true } } },
    }),
    db.post.count({ where: { ...SHOP_WHERE, access: 'VIP_ONLY' } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const categories: ShopCategory[] = cats.map((c) => ({ slug: c.slug, name: c.name, count: c._count.posts + c._count.postLinks }));

  const base = (() => {
    const p = new URLSearchParams();
    if (cat) p.set('cat', cat);
    if (sort !== 'new') p.set('sort', sort);
    const qs = p.toString();
    return qs ? `/shop?${qs}` : '/shop';
  })();

  return (
    <div className="space-y-4">
      {/* Hero cửa hàng */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 p-6 text-white shadow-card sm:p-8">
        <div className="flex items-center gap-2 text-lg font-black sm:text-xl">
          <ShoppingBag size={24} /> Cửa hàng Nova
        </div>
        <p className="mt-1 max-w-xl text-sm text-white/90">
          Tài nguyên, tài liệu và khoá học chất lượng. Mở khoá bằng điểm tích luỹ, số dư hoặc quyền lợi VIP.
        </p>
      </section>

      <ShopFilters categories={categories} activeCat={cat} sort={sort} />

      <PostGrid posts={items.map(toCardData)} empty="Chưa có sản phẩm nào trong mục này." />

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} basePath={base} />}

      {vipCount > 0 && (
        <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Nâng cấp VIP để mở khoá nội dung độc quyền và được giảm giá khi mua.
          </p>
          <Link href="/vip" className="btn-primary !px-3.5 !py-2 text-sm"><Crown size={15} /> Xem gói VIP</Link>
        </div>
      )}
    </div>
  );
}

