import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/admin';
import { WriteForm, type CatOption } from '@/components/write/WriteForm';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

export const metadata: Metadata = { title: 'Đăng hàng cửa hàng' };
export const dynamic = 'force-dynamic';

/** Đăng nội dung cho cửa hàng — chỉ có ở trang quản trị. */
export default async function AdminNewPostPage() {
  await requireSuperAdmin();

  const cats = await db.category.findMany({ take: CONFIG_LIST_CAP,
    orderBy: [{ order: 'asc' }],
    select: { slug: true, name: true, color: true, parent: { select: { name: true } } },
  });
  const options: CatOption[] = cats.map((c) => ({
    slug: c.slug, name: c.name, color: c.color, parentName: c.parent?.name ?? null,
  }));

  return (
    <div className="space-y-4">
      <Link href="/admin/posts" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600">
        <ArrowLeft size={15} /> Quản lý bài viết
      </Link>

      <div className="flex items-center gap-2">
        <ShoppingBag size={20} className="text-brand-500" />
        <div>
          <h1 className="text-xl font-bold text-ink-900 dark:text-white">Đăng nội dung cửa hàng</h1>
          <p className="text-sm text-ink-500">Đặt giá bằng điểm, tiền hoặc khoá theo VIP. Thành viên thường chỉ đăng bài miễn phí.</p>
        </div>
      </div>

      <WriteForm categories={options} canSell />
    </div>
  );
}
