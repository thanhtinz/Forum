import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { CategoryManager, type CatRow } from '@/components/admin/CategoryManager';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

export const metadata: Metadata = { title: 'Chuyên mục' };
export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const cats = await db.category.findMany({ take: CONFIG_LIST_CAP,
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, slug: true, color: true, icon: true, description: true, order: true, parentId: true, _count: { select: { posts: true, postLinks: true } } },
  });
  const rows: CatRow[] = cats.map((c) => ({
    id: c.id, name: c.name, slug: c.slug, color: c.color, icon: c.icon,
    description: c.description, order: c.order, parentId: c.parentId,
    postCount: c._count.posts + c._count.postLinks,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Chuyên mục cửa hàng</h1>
        <p className="text-sm text-ink-500">Chuyên mục cho bài bán hàng (hỗ trợ một cấp con). Khu vực diễn đàn cấu hình ở mục riêng.</p>
      </div>
      <CategoryManager categories={rows} />
    </div>
  );
}
