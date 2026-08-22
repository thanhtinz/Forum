import Link from 'next/link';
import { cn } from '@/lib/utils';
import { SHOP_SORTS, type ShopSort } from '@/lib/shop';

export interface ShopCategory { slug: string; name: string; count: number }

/** Thanh lọc cửa hàng: chuyên mục + sắp xếp (điều hướng bằng liên kết). */
export function ShopFilters({ categories, activeCat, sort }: {
  categories: ShopCategory[];
  activeCat?: string;
  sort: ShopSort;
}) {
  const href = (cat?: string, s?: ShopSort) => {
    const p = new URLSearchParams();
    if (cat) p.set('cat', cat);
    if (s && s !== 'new') p.set('sort', s);
    const qs = p.toString();
    return qs ? `/shop?${qs}` : '/shop';
  };

  return (
    <div className="card space-y-3 p-3.5">
      {/* Chuyên mục */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink-400">Chuyên mục</span>
        <Link href={href(undefined, sort)}
          className={cn('rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
            !activeCat ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300')}>
          Tất cả
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={href(c.slug, sort)}
            className={cn('rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              activeCat === c.slug ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300')}>
            {c.name} <span className="text-xs opacity-70">{c.count}</span>
          </Link>
        ))}
      </div>

      {/* Sắp xếp */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-3 dark:border-ink-800">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-ink-400">Sắp xếp</span>
        {SHOP_SORTS.map((s) => (
          <Link key={s.key} href={href(activeCat, s.key)}
            className={cn('rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
              sort === s.key ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300' : 'text-ink-500 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800')}>
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
