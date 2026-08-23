import Link from 'next/link';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { Download, Eye, Plus, RefreshCw, Search, Star } from 'lucide-react';
import { db } from '@/lib/db';
import { GAME_STATUS_LABEL, assetUrl } from '@/lib/game';
import { fmtCount } from '@/lib/utils';
import { Pagination } from '@/components/Pagination';
import { refreshTrending, setGameStatus, toggleGameFlag } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Quản lý game', robots: { index: false } };

const PAGE_SIZE = 20;

const STATUSES = [
  { key: 'ALL' },
  { key: 'DRAFT' },
  { key: 'PENDING' },
  { key: 'PUBLISHED' },
  { key: 'ARCHIVED' },
] as const;

export default async function AdminGamesPage({ searchParams }: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  // Trạng thái chọn từ menu quản trị (`?status=`), 'ALL' nghĩa là không lọc.
  const status = STATUSES.some((x) => x.key === sp.status) ? sp.status! : 'ALL';
  const page = Math.max(1, Number(sp.page ?? '1') || 1);

  const where = {
    ...(status === 'ALL' ? {} : { status: status as 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'ARCHIVED' }),
    ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, { slug: { contains: q, mode: 'insensitive' as const } }] } : {}),
  };

  const [total, games] = await Promise.all([
    db.game.count({ where }),
    db.game.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { versions: true } }, platform: { select: { name: true } } },
    }),
  ]);

  const qs = new URLSearchParams({ ...(q ? { q } : {}), ...(status === 'ALL' ? {} : { status }) }).toString();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="zib-title text-xl">Quản lý game ({fmtCount(total)})</h1>
        <div className="flex gap-2">
          <form action={refreshTrending}>
            <button type="submit" className="btn-outline !py-1.5 text-sm"><RefreshCw size={14} /> Tính lại trending</button>
          </form>
          <Link href="/admin/games/new" className="btn-primary !py-1.5 text-sm"><Plus size={15} /> Thêm game</Link>
        </div>
      </div>

      <form className="card flex flex-wrap items-center gap-2 p-3">
        {/* Lọc theo trạng thái nằm ở menu quản trị; ở đây chỉ còn tìm kiếm. */}
        {status !== 'ALL' && <input type="hidden" name="status" value={status} />}
        <div className="relative min-w-52 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input name="q" defaultValue={q} placeholder="Tìm theo tên hoặc slug…" className="input !py-2 pl-9 text-sm" />
        </div>
        <button type="submit" className="btn-primary !py-2 text-sm">Tìm</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[840px] text-sm">
          <thead className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
            <tr>
              <th className="p-3 font-bold">Game</th>
              <th className="p-3 font-bold">Trạng thái</th>
              <th className="p-3 font-bold">Version</th>
              <th className="p-3 font-bold">Thống kê</th>
              <th className="p-3 font-bold">Cập nhật</th>
              <th className="p-3 font-bold">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {games.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-ink-400">Chưa có game nào.</td></tr>
            )}
            {games.map((g) => (
              <tr key={g.id}>
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    {assetUrl(g.icon)
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={assetUrl(g.icon)!} alt="" className="h-9 w-9 rounded-lg object-cover" style={{ imageRendering: 'pixelated' }} />
                      : <span className="h-9 w-9 rounded-lg bg-ink-100 dark:bg-ink-800" />}
                    <span className="min-w-0">
                      <Link href={`/admin/games/${g.id}`} className="block truncate font-semibold hover:text-brand-600">{g.title}</Link>
                      <span className="block truncate text-[11px] text-ink-400">
                        /{g.slug}{g.platform && ` · ${g.platform.name}`}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="p-3">
                  <form action={async (fd: FormData) => { 'use server'; await setGameStatus(g.id, String(fd.get('status')) as 'DRAFT'); }}>
                    <select name="status" defaultValue={g.status} className="input !w-auto !py-1 text-xs">
                      {Object.entries(GAME_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                    <button type="submit" className="ml-1 text-[11px] text-brand-600 hover:underline">Lưu</button>
                  </form>
                </td>
                <td className="p-3 text-ink-500">{g._count.versions}</td>
                <td className="p-3">
                  <span className="flex flex-wrap gap-2 text-[11px] text-ink-400">
                    <span className="flex items-center gap-1"><Eye size={11} />{fmtCount(g.viewCount)}</span>
                    <span className="flex items-center gap-1"><Download size={11} />{fmtCount(g.downloadCount)}</span>
                    <span className="flex items-center gap-1"><Star size={11} />{g.ratingCount > 0 ? (g.ratingSum / g.ratingCount).toFixed(1) : '—'}</span>
                  </span>
                </td>
                <td className="p-3 text-[11px] text-ink-400">{format(g.updatedAt, 'dd/MM/yy HH:mm')}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <form action={async () => { 'use server'; await toggleGameFlag(g.id, 'featured'); }}>
                      <button type="submit" title="Nổi bật"
                        className={`grid h-7 w-7 place-items-center rounded-lg ${g.featured ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>
                        <Star size={13} />
                      </button>
                    </form>
                    <Link href={`/admin/games/${g.id}`} className="text-[11px] text-brand-600 hover:underline">Sửa</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} basePath={qs ? `/admin/games?${qs}` : '/admin/games'} />
    </div>
  );
}
