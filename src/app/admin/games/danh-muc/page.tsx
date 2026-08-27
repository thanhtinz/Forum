import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/admin';
import { GameTaxonomyManager, type TaxonomyRow } from '@/components/admin/GameTaxonomyManager';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Danh mục kho game', robots: { index: false } };

/**
 * Quản lý phân loại của kho game.
 *
 * Trước đây thể loại / dòng máy / độ phân giải / bộ sưu tập chỉ sinh ra từ dữ
 * liệu mẫu: biểu mẫu sửa game cho tick chọn, nhưng không có chỗ nào tạo thêm.
 */
export default async function GameTaxonomyPage() {
  // Kho game là hàng của nền tảng: chỉ quản trị viên, không cho điều hành viên.
  await requireSuperAdmin();

  const [genres, platforms, resolutions, collections] = await Promise.all([
    db.gameGenre.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { id: true, slug: true, name: true, icon: true, color: true, order: true, _count: { select: { games: true } } },
    }),
    db.gamePlatform.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { id: true, slug: true, name: true, icon: true, order: true, _count: { select: { games: true } } },
    }),
    db.gameResolution.findMany({
      orderBy: [{ order: 'asc' }, { width: 'asc' }],
      select: { id: true, slug: true, label: true, width: true, height: true, order: true, _count: { select: { games: true } } },
    }),
    db.gameCollection.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      select: { id: true, slug: true, name: true, description: true, featured: true, order: true, _count: { select: { games: true } } },
    }),
  ]);

  const rows = (list: { _count: { games: number } }[]): TaxonomyRow[] =>
    list.map((r) => {
      const { _count, ...rest } = r as TaxonomyRow & { _count: { games: number } };
      return { ...rest, count: _count.games };
    });

  return (
    <div className="space-y-4">
      <Link href="/admin/games" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
        <ChevronLeft size={15} /> Danh sách game
      </Link>

      <div>
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Danh mục kho game</h1>
        <p className="text-sm text-ink-500">
          Thể loại, dòng máy, độ phân giải và bộ sưu tập — chính là các bộ lọc người dùng thấy ở trang kho game.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GameTaxonomyManager kind="genre" rows={rows(genres)} />
        <GameTaxonomyManager kind="platform" rows={rows(platforms)} />
        <GameTaxonomyManager
          kind="resolution"
          rows={resolutions.map((r) => ({
            id: r.id, slug: r.slug, name: r.label, width: r.width, height: r.height,
            order: r.order, count: r._count.games,
          }))}
        />
        <GameTaxonomyManager kind="collection" rows={rows(collections)} />
      </div>
    </div>
  );
}
