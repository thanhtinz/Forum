import type { Metadata } from 'next';
import { db } from '@/lib/db';
import { StickerPackManager, type PackRow } from '@/components/admin/StickerPackManager';

export const metadata: Metadata = { title: 'Bộ sticker' };
export const dynamic = 'force-dynamic';

export default async function AdminStickersPage() {
  const rows = await db.stickerPack.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true, name: true, active: true,
      _count: { select: { stickers: true } },
      stickers: { orderBy: { order: 'asc' }, take: 8, select: { id: true, url: true, name: true } },
    },
  });
  const packs: PackRow[] = rows.map((p) => ({
    id: p.id, name: p.name, active: p.active, count: p._count.stickers, preview: p.stickers,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Bộ sticker</h1>
        <p className="text-sm text-ink-500">Sticker dùng trong khung soạn trả lời và bài viết.</p>
      </div>
      <StickerPackManager packs={packs} />
    </div>
  );
}
