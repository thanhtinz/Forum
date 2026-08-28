import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { SlideManager, type SlideRow } from '@/components/admin/AppearanceManager';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';

export const metadata: Metadata = { title: 'Slide trang chủ' };
export const dynamic = 'force-dynamic';

export default async function AdminSlidesPage() {
  const slides = await db.slide.findMany({ take: CONFIG_LIST_CAP,
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, title: true, subtitle: true, image: true, link: true, order: true, active: true },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Slide trang chủ</h1>
        <p className="text-sm text-ink-500">Ảnh lớn dùng cho khối giới thiệu. Slide đầu tiên làm ảnh chính.</p>
      </div>
      <SlideManager slides={slides as SlideRow[]} />
    </div>
  );
}
