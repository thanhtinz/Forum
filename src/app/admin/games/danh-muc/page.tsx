import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/admin';
import { GameTaxonomyManager, type TaxonomyRow } from '@/components/admin/GameTaxonomyManager';
import { Pagination } from '@/components/Pagination';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Danh mục kho game', robots: { index: false } };

/**
 * Quản lý phân loại của kho game.
 *
 * Trước đây thể loại / dòng máy / độ phân giải / bộ sưu tập chỉ sinh ra từ dữ
 * liệu mẫu: biểu mẫu sửa game cho tick chọn, nhưng không có chỗ nào tạo thêm.
 */
const PAGE_SIZE = 25;
const num = (v?: string) => Math.max(1, parseInt(v ?? '1', 10) || 1);

export default async function GameTaxonomyPage({ searchParams }: {
  searchParams: Promise<{ tl?: string; dm?: string; pg?: string; bst?: string }>;
}) {
  // Kho game là hàng của nền tảng: chỉ quản trị viên, không cho điều hành viên.
  await requireSuperAdmin();

  // Bốn nhóm nằm chung một trang nên mỗi nhóm phải có tham số trang riêng;
  // dùng chung `?page=` thì lật nhóm này lại kéo cả ba nhóm kia đi theo.
  const sp = await searchParams;
  const pages = { tl: num(sp.tl), dm: num(sp.dm), pg: num(sp.pg), bst: num(sp.bst) };
  const skip = (p: number) => (p - 1) * PAGE_SIZE;

  const [genreCount, platformCount, resolutionCount, collectionCount,
    genres, platforms, resolutions, collections] = await Promise.all([
    db.gameGenre.count(),
    db.gamePlatform.count(),
    db.gameResolution.count(),
    db.gameCollection.count(),
    db.gameGenre.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }], skip: skip(pages.tl), take: PAGE_SIZE,
      select: { id: true, slug: true, name: true, icon: true, color: true, order: true, _count: { select: { games: true } } },
    }),
    db.gamePlatform.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }], skip: skip(pages.dm), take: PAGE_SIZE,
      select: { id: true, slug: true, name: true, icon: true, order: true, _count: { select: { games: true } } },
    }),
    db.gameResolution.findMany({
      orderBy: [{ order: 'asc' }, { width: 'asc' }], skip: skip(pages.pg), take: PAGE_SIZE,
      select: { id: true, slug: true, label: true, width: true, height: true, order: true, _count: { select: { games: true } } },
    }),
    db.gameCollection.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }], skip: skip(pages.bst), take: PAGE_SIZE,
      select: { id: true, slug: true, name: true, description: true, featured: true, order: true, _count: { select: { games: true } } },
    }),
  ]);

  /** Lật một nhóm mà giữ nguyên trang của ba nhóm kia. */
  const keepOthers = (drop: keyof typeof pages) =>
    `/admin/games/danh-muc?${Object.entries(pages)
      .filter(([k]) => k !== drop)
      .map(([k, v]) => `${k}=${v}`)
      .join('&')}`;

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
        <div>
          <GameTaxonomyManager kind="genre" rows={rows(genres)} />
          <Pagination page={pages.tl} totalPages={Math.ceil(genreCount / PAGE_SIZE)}
            pageParam="tl" basePath={keepOthers('tl')} />
        </div>
        <div>
          <GameTaxonomyManager kind="platform" rows={rows(platforms)} />
          <Pagination page={pages.dm} totalPages={Math.ceil(platformCount / PAGE_SIZE)}
            pageParam="dm" basePath={keepOthers('dm')} />
        </div>
        <div>
          <GameTaxonomyManager
            kind="resolution"
            rows={resolutions.map((r) => ({
              id: r.id, slug: r.slug, name: r.label, width: r.width, height: r.height,
              order: r.order, count: r._count.games,
            }))}
          />
          <Pagination page={pages.pg} totalPages={Math.ceil(resolutionCount / PAGE_SIZE)}
            pageParam="pg" basePath={keepOthers('pg')} />
        </div>
        <div>
          <GameTaxonomyManager kind="collection" rows={rows(collections)} />
          <Pagination page={pages.bst} totalPages={Math.ceil(collectionCount / PAGE_SIZE)}
            pageParam="bst" basePath={keepOthers('bst')} />
        </div>
      </div>
    </div>
  );
}
