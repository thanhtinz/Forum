import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { ChevronLeft, ExternalLink, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/admin';
import { assetUrl, DOWNLOAD_PLATFORMS } from '@/lib/game';
import { gameAnalytics } from '@/lib/game-stats';
import { fmtBytes, fmtCount } from '@/lib/utils';
import { GameEditForm } from '@/components/admin/GameEditForm';
import { FileForm, ImageForm, VersionForm } from '@/components/admin/GameSubForms';
import { deleteFile, deleteGame, deleteImage, deleteVersion, quarantineFile, setLatestVersion } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sửa game', robots: { index: false } };

export default async function AdminGameEditPage({ params }: { params: Promise<{ id: string }> }) {
  // Kho game là hàng của nền tảng: chỉ quản trị viên, không cho điều hành viên.
  await requireSuperAdmin();

  const { id } = await params;

  const [game, genres, platforms, resolutions] = await Promise.all([
    db.game.findUnique({
      where: { id },
      include: {
        genres: true,
        tags: { include: { tag: true } },
        versions: { orderBy: [{ platform: 'asc' }, { latest: 'desc' }, { createdAt: 'desc' }], include: { files: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    }),
    db.gameGenre.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    db.gamePlatform.findMany({ orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    db.gameResolution.findMany({ orderBy: [{ order: 'asc' }, { width: 'asc' }], select: { id: true, label: true } }),
  ]);
  if (!game) notFound();

  const stats = await gameAnalytics(game.id);
  const versionOptions = game.versions.map((v) => ({
    id: v.id,
    platform: v.platform,
    name: `${DOWNLOAD_PLATFORMS[v.platform].label} · v${v.version}${v.latest ? ' (latest)' : ''}`,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/admin/games" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
          <ChevronLeft size={15} /> Danh sách game
        </Link>
        <div className="flex gap-2">
          <Link href={`/games/${game.slug}`} target="_blank" className="btn-outline !py-1.5 text-sm">
            <ExternalLink size={14} /> Xem trang công khai
          </Link>
          <form action={async () => { 'use server'; await deleteGame(game.id); }}>
            <button type="submit" className="btn !py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
              <Trash2 size={14} /> Xoá game
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Views" value={fmtCount(stats.views)} sub={`${fmtCount(stats.uniqueViews)} unique`} />
        <Tile label="Downloads" value={fmtCount(stats.downloads)} sub={`${fmtCount(stats.uniqueDownloads)} unique`} />
        <Tile label="Xem → tải" value={`${stats.viewToDownload}%`} />
        <Tile label="Trending" value={game.trendingScore.toFixed(1)} />
        <Tile label="Rating" value={game.ratingCount ? (game.ratingSum / game.ratingCount).toFixed(1) : '—'} sub={`${game.ratingCount} lượt`} />
      </div>

      <section className="card p-4 sm:p-5">
        <h2 className="zib-title mb-4">Thông tin game</h2>
        <GameEditForm
          game={game}
          genres={genres}
          selectedGenreIds={game.genres.map((g) => g.genreId)}
          platforms={platforms}
          resolutions={resolutions.map((r) => ({ id: r.id, name: r.label }))}
          tags={game.tags.map((t) => t.tag.name).join(', ')}
        />
      </section>

      {/* ── Version & file ── */}
      <section className="card p-4 sm:p-5">
        <h2 className="zib-title mb-4">Phiên bản & file</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
              <tr>
                <th className="p-2 font-bold">Nền tảng</th>
                <th className="p-2 font-bold">Version</th>
                <th className="p-2 font-bold">Phát hành</th>
                <th className="p-2 font-bold">Dung lượng</th>
                <th className="p-2 font-bold">File</th>
                <th className="p-2 font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {game.versions.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-ink-400">Chưa có version nào.</td></tr>}
              {game.versions.map((v) => (
                <tr key={v.id}>
                  <td className="p-2 font-semibold text-ink-500">{DOWNLOAD_PLATFORMS[v.platform].label}</td>
                  <td className="p-2">
                    <b>v{v.version}</b>
                    {v.latest && <span className="ml-1.5 chip bg-brand-500 !px-1.5 !py-0 text-[10px] text-white">Latest</span>}
                  </td>
                  <td className="p-2 text-ink-500">{v.releaseDate ? format(v.releaseDate, 'dd/MM/yyyy') : '—'}</td>
                  <td className="p-2 text-ink-500">{fmtBytes(v.sizeBytes)}</td>
                  <td className="p-2">
                    <ul className="space-y-1">
                      {v.files.length === 0 && <li className="text-[11px] text-ink-400">chưa có file</li>}
                      {v.files.map((f) => (
                        <li key={f.id} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                          <b>{f.type}</b>
                          <span className="text-ink-400">{fmtBytes(f.sizeBytes)}</span>
                          <span className={`chip !px-1.5 !py-0 text-[10px] ${f.scanStatus === 'CLEAN'
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50'
                            : f.scanStatus === 'QUARANTINED'
                              ? 'bg-red-100 text-red-600 dark:bg-red-950/50'
                              : 'bg-amber-100 text-amber-600 dark:bg-amber-950/50'}`}>
                            {f.scanStatus}
                          </span>
                          <form action={async () => { 'use server'; await quarantineFile(f.id, f.scanStatus !== 'QUARANTINED'); }}>
                            <button type="submit" className="text-ink-400 hover:text-amber-600" title={f.scanStatus === 'QUARANTINED' ? 'Bỏ cách ly' : 'Cách ly file'}>
                              {f.scanStatus === 'QUARANTINED' ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                            </button>
                          </form>
                          <form action={async () => { 'use server'; await deleteFile(f.id); }}>
                            <button type="submit" className="text-ink-400 hover:text-red-500" title="Xoá file"><Trash2 size={13} /></button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-2 text-[11px]">
                      {!v.latest && (
                        <form action={async () => { 'use server'; await setLatestVersion(v.id); }}>
                          <button type="submit" className="text-brand-600 hover:underline">Đặt Latest</button>
                        </form>
                      )}
                      <form action={async () => { 'use server'; await deleteVersion(v.id); }}>
                        <button type="submit" className="text-red-500 hover:underline">Xoá</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-ink-200 p-3 dark:border-ink-700">
            <h3 className="mb-3 text-sm font-bold">Thêm / sửa version</h3>
            <VersionForm gameId={game.id} versions={versionOptions} />
          </div>
          <div className="rounded-xl border border-ink-200 p-3 dark:border-ink-700">
            <h3 className="mb-3 text-sm font-bold">Gắn file JAR / JAD</h3>
            <FileForm versions={versionOptions} />
          </div>
        </div>
      </section>

      {/* ── Ảnh ── */}
      <section className="card p-4 sm:p-5">
        <h2 className="zib-title mb-4">Ảnh & screenshot</h2>
        {game.images.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-3">
            {game.images.map((img) => (
              <div key={img.id} className="w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(img.storageKey)!} alt={img.caption ?? ''} className="h-20 w-full rounded-lg object-cover" style={{ imageRendering: 'pixelated' }} />
                <p className="mt-1 truncate text-[10px] text-ink-400">{img.type} · #{img.sortOrder}</p>
                <form action={async () => { 'use server'; await deleteImage(img.id); }}>
                  <button type="submit" className="text-[11px] text-red-500 hover:underline">Xoá</button>
                </form>
              </div>
            ))}
          </div>
        )}
        <div className="rounded-xl border border-ink-200 p-3 dark:border-ink-700">
          <ImageForm gameId={game.id} />
        </div>
      </section>

    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-2.5 text-center">
      <p className="text-base font-black leading-tight">{value}</p>
      <p className="text-[10px] text-ink-500">{label}</p>
      {sub && <p className="text-[10px] text-ink-400">{sub}</p>}
    </div>
  );
}
