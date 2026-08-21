import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { CategoryManager, type CatRow } from '@/components/admin/CategoryManager';

export const metadata: Metadata = { title: 'Chuyên mục' };
export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const cats = await db.category.findMany({
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
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Quản lý chuyên mục</h1>
        <p className="text-sm text-ink-500">Tạo và sắp xếp chuyên mục (hỗ trợ một cấp con).</p>
      </div>
      <CategoryManager categories={rows} />
    </div>
  );
}
