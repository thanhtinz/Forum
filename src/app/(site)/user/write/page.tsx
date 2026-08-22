import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { WriteForm, type CatOption } from '@/components/write/WriteForm';

export const metadata: Metadata = { title: 'Đăng bài viết' };
export const dynamic = 'force-dynamic';

export default async function WritePage() {
  const session = await auth();
  if (!session?.user) redirect('/login?callbackUrl=/user/write');

  const cats = await db.category.findMany({
    orderBy: [{ order: 'asc' }],
    select: { slug: true, name: true, color: true, parent: { select: { name: true } } },
  });
  const options: CatOption[] = cats.map((c) => ({ slug: c.slug, name: c.name, color: c.color, parentName: c.parent?.name ?? null }));

  return (
    <div className="mx-auto max-w-3xl">
      {/* Bán nội dung là hàng của cửa hàng — chỉ đăng trong trang quản trị */}
      <WriteForm categories={options} canSell={false} />
    </div>
  );
}
