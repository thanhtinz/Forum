import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import {
  Activity, AlertTriangle, Building2, Calendar, Clock, Download, Eye,
  Gamepad2, Keyboard, Languages, MonitorSmartphone,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  assetUrl, avgRating, gameBadges, gameCardSelect, gameTint, LANGUAGE_LABEL, toGameCard,
} from '@/lib/game';
import { gameAnalytics } from '@/lib/game-stats';
import { fmtBytes, fmtCount } from '@/lib/utils';
import { DownloadPanel, type VersionInfo } from '@/components/game/DownloadPanel';
import { GameActions } from '@/components/game/GameActions';
import { GameGallery } from '@/components/game/GameGallery';
import { GameGrid } from '@/components/game/GameGrid';
import { GameViewTracker } from '@/components/game/GameViewTracker';
import { RatingStars } from '@/components/game/RatingStars';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await db.game.findUnique({
    where: { slug },
    select: { title: true, titleVi: true, description: true, icon: true },
  });
  if (!game) return { title: 'Không tìm thấy game' };
  return {
    title: game.titleVi ? `${game.title} (${game.titleVi})` : game.title,
    description: game.description?.slice(0, 160) ?? undefined,
    openGraph: { images: assetUrl(game.icon) ? [assetUrl(game.icon)!] : undefined },
  };
}

interface ControlHint { key: string; action: string }

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const game = await db.game.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      platform: true,
      resolution: true,
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
      images: { orderBy: { sortOrder: 'asc' } },
      versions: {
        orderBy: [{ latest: 'desc' }, { releaseDate: 'desc' }, { createdAt: 'desc' }],
        include: { files: true },
      },
      _count: { select: { favorites: true } },
    },
  });
  if (!game) notFound();

  const [stats, myRating, myFavorite, related] = await Promise.all([
    gameAnalytics(game.id),
    userId ? db.gameRating.findUnique({ where: { gameId_userId: { gameId: game.id, userId } }, select: { score: true } }) : null,
    userId ? db.favorite.findFirst({ where: { userId, gameId: game.id }, select: { id: true } }) : null,
    db.game.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: game.id },
        OR: [
          { genres: { some: { genreId: { in: game.genres.map((g) => g.genreId) } } } },
          game.series ? { series: game.series } : { id: 'none' },
        ],
      },
      orderBy: { trendingScore: 'desc' },
      take: 6,
      select: gameCardSelect,
    }),
  ]);

  const latest = game.versions.find((v) => v.latest) ?? game.versions[0];
  const latestJar = latest?.files.find((f) => f.type === 'JAR');
  const tint = gameTint(game.slug);
  const icon = assetUrl(game.icon);
  const rating = avgRating(game.ratingSum, game.ratingCount);
  const badges = gameBadges(game);
  const screenshots = game.images
    .filter((i) => i.type === 'SCREENSHOT')
    .map((i) => ({ url: assetUrl(i.storageKey)!, caption: i.caption, width: i.width, height: i.height }))
    .filter((s) => !!s.url);
  const controls = Array.isArray(game.controls) ? (game.controls as unknown as ControlHint[]) : [];

  const versionInfos: VersionInfo[] = game.versions.map((v) => ({
    id: v.id,
    version: v.version,
    releaseDate: v.releaseDate ? v.releaseDate.toISOString() : null,
    changelog: v.changelog,
    sizeBytes: v.sizeBytes != null ? Number(v.sizeBytes) : null,
    latest: v.latest,
    note: v.note,
    files: v.files.map((f) => ({
      type: f.type,
      sizeBytes: f.sizeBytes != null ? Number(f.sizeBytes) : null,
      checksum: f.checksum,
      checksumAlgo: f.checksumAlgo,
      available: f.scanStatus !== 'QUARANTINED',
    })),
  }));

  return (
    <div className="space-y-5">
      <GameViewTracker gameId={game.id} slug={game.slug} />

      {/* ── Đầu trang ── */}
      <header className="card overflow-hidden">
        {assetUrl(game.cover) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(game.cover)!} alt="" className="h-36 w-full object-cover sm:h-48" />
        )}
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={icon} alt={game.title} width={96} height={96}
              className="h-24 w-24 shrink-0 rounded-2xl object-cover" style={{ imageRendering: 'pixelated' }} />
          ) : (
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl" style={{ background: `${tint}1f`, color: tint }}>
              <Gamepad2 size={40} />
            </span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black sm:text-2xl">{game.title}</h1>
              {badges.map((b) => (
                <span key={b.label} className={`chip !px-2 !py-0.5 text-[10px] ${b.className}`}>{b.label}</span>
              ))}
            </div>
            {game.titleVi && <p className="text-sm text-ink-500">Bản Việt hóa: {game.titleVi}</p>}

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-ink-500">
              <span className="flex items-center gap-1">
                <RatingStars value={rating} />
                <b>{rating > 0 ? rating.toFixed(1) : '—'}</b>
                <span className="text-ink-400">({fmtCount(game.ratingCount)})</span>
              </span>
              <span className="flex items-center gap-1"><Download size={14} />{fmtCount(game.downloadCount)} lượt tải</span>
              <span className="flex items-center gap-1"><Eye size={14} />{fmtCount(game.viewCount)} lượt xem</span>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {game.genres.map((g) => (
                <Link key={g.genreId} href={`/games/browse?genre=${g.genre.slug}`}
                  className="chip bg-ink-100 text-ink-600 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300">
                  {g.genre.name}
                </Link>
              ))}
              {game.tags.map((t) => (
                <Link key={t.tagId} href={`/games/search?q=${encodeURIComponent(t.tag.name)}`}
                  className="chip border border-ink-200 text-ink-500 hover:text-brand-600 dark:border-ink-700">
                  #{t.tag.name}
                </Link>
              ))}
            </div>

            <Link href="#download" className="btn-primary mt-4 !px-6">
              <Download size={17} /> TẢI GAME
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ── Nội dung ── */}
        <div className="min-w-0 space-y-5">
          <section className="card p-4 sm:p-5">
            <h2 className="zib-title mb-4">Thông tin game</h2>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Row label="Tên" value={game.title} />
              <Row label="Tên Việt hóa" value={game.titleVi ?? '—'} />
              <Row label="Thể loại" value={game.genres.map((g) => g.genre.name).join(', ') || '—'} />
              <Row label="Version mới nhất" value={latest ? `v${latest.version}` : '—'} />
              <Row label="Dung lượng" value={fmtBytes(latest?.sizeBytes ?? latestJar?.sizeBytes)} />
              <Row label="Ngôn ngữ" value={LANGUAGE_LABEL[game.language] ?? game.language} icon={<Languages size={13} />} />
              <Row label="Platform" value={game.platform?.name ?? '—'} icon={<MonitorSmartphone size={13} />} />
              <Row label="Độ phân giải" value={game.resolution?.label ?? '—'} />
              <Row label="Developer" value={game.developer ?? '—'} icon={<Building2 size={13} />} />
              <Row label="Publisher" value={game.publisher ?? '—'} />
              <Row label="Năm phát hành" value={game.releaseYear ? String(game.releaseYear) : '—'} icon={<Calendar size={13} />} />
              <Row label="Series" value={game.series ?? '—'} />
            </dl>
          </section>

          {(game.description || game.gameplay) && (
            <section className="card p-4 sm:p-5">
              <h2 className="zib-title mb-3">Giới thiệu</h2>
              {game.description && <p className="whitespace-pre-line text-sm leading-relaxed">{game.description}</p>}
              {game.gameplay && (
                <>
                  <h3 className="mt-4 font-bold">Lối chơi</h3>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">{game.gameplay}</p>
                </>
              )}
            </section>
          )}

          {screenshots.length > 0 && (
            <section className="card p-4 sm:p-5">
              <h2 className="zib-title mb-3">Ảnh trong game</h2>
              <GameGallery shots={screenshots} />
            </section>
          )}

          {game.trailerUrl && (
            <section className="card p-4 sm:p-5">
              <h2 className="zib-title mb-3">Trailer</h2>
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <iframe
                  src={game.trailerUrl}
                  title={`Trailer ${game.title}`}
                  allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                  className="h-full w-full border-0"
                />
              </div>
            </section>
          )}

          {controls.length > 0 && (
            <section className="card p-4 sm:p-5">
              <h2 className="zib-title mb-3 flex items-center gap-2"><Keyboard size={17} /> Điều khiển</h2>
              <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
                {controls.map((c, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 rounded-lg bg-ink-50 px-3 py-1.5 dark:bg-ink-800/60">
                    <code className="rounded bg-white px-1.5 py-0.5 text-xs font-semibold dark:bg-ink-900">{c.key}</code>
                    <span className="text-ink-500">{c.action}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {game.versions.length > 0 && (
            <section className="card p-4 sm:p-5">
              <h2 className="zib-title mb-3 flex items-center gap-2"><Clock size={17} /> Lịch sử phiên bản</h2>
              <ol className="space-y-3">
                {game.versions.map((v) => (
                  <li key={v.id} className="border-l-2 border-ink-200 pl-3 dark:border-ink-700">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <b>v{v.version}</b>
                      {v.latest && <span className="chip bg-brand-500 !px-2 !py-0 text-[10px] text-white">Latest</span>}
                      <span className="text-xs text-ink-400">
                        {v.releaseDate ? format(v.releaseDate, 'dd/MM/yyyy') : '—'} · {fmtBytes(v.sizeBytes)}
                      </span>
                    </div>
                    {v.changelog && <p className="mt-1 whitespace-pre-line text-sm text-ink-500">{v.changelog}</p>}
                    {v.files.some((f) => f.checksum) && (
                      <p className="mt-1 break-all text-[11px] text-ink-400">
                        {v.files.filter((f) => f.checksum).map((f) => `${f.type} ${f.checksumAlgo}: ${f.checksum}`).join(' · ')}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(game.compatibilityNote || game.knownIssues) && (
            <section className="card p-4 sm:p-5">
              <h2 className="zib-title mb-3 flex items-center gap-2"><AlertTriangle size={17} /> Lưu ý</h2>
              {game.compatibilityNote && (
                <>
                  <h3 className="text-sm font-bold">Ghi chú tương thích</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-500">{game.compatibilityNote}</p>
                </>
              )}
              {game.knownIssues && (
                <>
                  <h3 className="mt-3 text-sm font-bold">Lỗi đã biết</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-500">{game.knownIssues}</p>
                </>
              )}
            </section>
          )}

          <section className="card p-4 sm:p-5">
            <h2 className="zib-title mb-3 flex items-center gap-2"><Activity size={17} /> Thống kê</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Lượt xem" value={fmtCount(stats.views)} sub={`${fmtCount(stats.uniqueViews)} người`} />
              <Stat label="Lượt tải" value={fmtCount(stats.downloads)} sub={`${fmtCount(stats.uniqueDownloads)} người`} />
              <Stat label="Xem → tải" value={`${stats.viewToDownload}%`} sub="tỉ lệ chuyển đổi" />
              <Stat label="Trending" value={game.trendingScore.toFixed(1)} sub="điểm xu hướng" />
              <Stat label="Cập nhật" value={format(game.updatedAt, 'dd/MM/yyyy')} sub={game.publishedAt ? `đăng ${format(game.publishedAt, 'dd/MM/yyyy')}` : ''} />
            </div>
          </section>

          {related.length > 0 && (
            <section>
              <h2 className="zib-title mb-3">Game liên quan</h2>
              <GameGrid games={related.map(toGameCard)} />
            </section>
          )}
        </div>

        {/* ── Cột phải ── */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <DownloadPanel slug={game.slug} versions={versionInfos} />
          <GameActions
            gameId={game.id}
            initialFavorite={!!myFavorite}
            favoriteCount={game._count.favorites}
            initialRating={rating}
            initialRatingCount={game.ratingCount}
            myRating={myRating?.score ?? 0}
          />
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-100 py-1.5 last:border-0 dark:border-ink-800">
      <dt className="flex items-center gap-1.5 shrink-0 text-ink-400">{icon}{label}</dt>
      <dd className="truncate text-right font-medium">{value}</dd>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3 text-center dark:bg-ink-800/60">
      <p className="text-lg font-black leading-tight">{value}</p>
      <p className="text-[11px] text-ink-500">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-ink-400">{sub}</p>}
    </div>
  );
}
