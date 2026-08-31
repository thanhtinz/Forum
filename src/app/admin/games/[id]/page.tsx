import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { ChevronLeft, ExternalLink, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/admin';
import { assetUrl, DOWNLOAD_PLATFORMS } from '@/lib/game';
import { gameAnalytics } from '@/lib/game-stats';
import { fmtBytes } from '@/lib/utils';
import { GameEditForm } from '@/components/admin/GameEditForm';
import { TroLyGameAi } from '@/components/admin/TroLyGameAi';
import { FileForm, ImageForm, VersionForm, type FileOption, type VersionOption } from '@/components/admin/GameSubForms';
import { NutXoa } from '@/components/admin/NutXoa';
import { deleteFile, deleteGame, deleteImage, deleteVersion, quarantineFile, setGameStatus, setLatestVersion } from '../actions';
import { CONFIG_LIST_CAP } from '@/lib/list-cap';
import { coAi } from '@/lib/ai';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Sửa game', robots: { index: false } };

/**
 * Số liệu ở trang quản trị ghi ĐẦY ĐỦ, không rút gọn kiểu `1.5K` như trang công
 * khai: 1.500 và 1.549 lượt tải là hai con số khác nhau, mà người vào đây là
 * người cần biết chính xác.
 */
const so = (n: number) => n.toLocaleString('vi');

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
    db.gameGenre.findMany({ take: CONFIG_LIST_CAP, orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    db.gamePlatform.findMany({ take: CONFIG_LIST_CAP, orderBy: { order: 'asc' }, select: { id: true, name: true } }),
    db.gameResolution.findMany({ take: CONFIG_LIST_CAP, orderBy: [{ order: 'asc' }, { width: 'asc' }], select: { id: true, label: true } }),
  ]);
  if (!game) notFound();

  const stats = await gameAnalytics(game.id);
  // Truyền ĐỦ dữ liệu đang lưu xuống biểu mẫu, không chỉ mỗi cái tên: chọn "sửa"
  // mà ô để trống thì lượt lưu sẽ xoá trắng đúng những ô ấy — xem `VersionOption`.
  const versionOptions: VersionOption[] = game.versions.map((v) => ({
    id: v.id,
    platform: v.platform,
    name: `${DOWNLOAD_PLATFORMS[v.platform].label} · v${v.version}${v.latest ? ' (latest)' : ''}`,
    version: v.version,
    releaseDate: v.releaseDate ? format(v.releaseDate, 'yyyy-MM-dd') : null,
    changelog: v.changelog,
    // BigInt không tuần tự hoá qua ranh giới server→client được.
    sizeBytes: v.sizeBytes != null ? String(v.sizeBytes) : null,
    note: v.note,
    pricePoints: v.pricePoints,
    latest: v.latest,
  }));
  const fileOptions: FileOption[] = game.versions.flatMap((v) => v.files.map((f) => ({
    id: f.id,
    name: `${DOWNLOAD_PLATFORMS[v.platform].label} · v${v.version} · ${f.type}`,
    versionId: v.id,
    type: f.type,
    storageKey: f.storageKey,
    fileName: f.fileName,
    sizeBytes: f.sizeBytes != null ? String(f.sizeBytes) : null,
    checksum: f.checksum,
    checksumAlgo: f.checksumAlgo,
    mimeType: f.mimeType,
    scanStatus: f.scanStatus,
    scanNote: f.scanNote,
  })));

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
            <NutXoa hoi={`Xoá hẳn game “${game.title}”? Mất luôn mọi version, file và ảnh.`}
              className="btn !py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
              <Trash2 size={14} /> Xoá game
            </NutXoa>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Views" value={so(stats.views)} sub={`${so(stats.uniqueViews)} unique`} />
        <Tile label="Downloads" value={so(stats.downloads)} sub={`${so(stats.uniqueDownloads)} unique`} />
        <Tile label="Xem → tải" value={`${stats.viewToDownload}%`} />
        <Tile label="Trending" value={game.trendingScore.toFixed(1)} />
        <Tile label="Rating" value={game.ratingCount ? (game.ratingSum / game.ratingCount).toFixed(1) : '—'} sub={`${game.ratingCount} lượt`} />
      </div>

      <ThanhDuyet id={game.id} trangThai={game.status} ngayDang={game.publishedAt} />

      {/* Trợ lý AI đặt TRƯỚC biểu mẫu tay: người vào đây phần lớn là để điền
          một game mới toanh, mà điền tay thì mất mươi phút còn nhờ AI tra rồi
          sửa thì mất một. Ai muốn tự gõ thì cuộn qua. */}
      <section>
        <TroLyGameAi gameId={game.id} coKhoa={coAi()} />
      </section>

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
                            <NutXoa hoi={`Xoá file ${f.type} của bản v${v.version}?`}
                              className="text-ink-400 hover:text-red-500" title="Xoá file" aria-label="Xoá file">
                              <Trash2 size={13} />
                            </NutXoa>
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
                        <NutXoa hoi={`Xoá bản v${v.version} (${DOWNLOAD_PLATFORMS[v.platform].label})? Mất luôn file đính kèm.`}
                          className="text-red-500 hover:underline">Xoá</NutXoa>
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
            <h3 className="mb-3 text-sm font-bold">Gắn / sửa file tải</h3>
            <FileForm versions={versionOptions} files={fileOptions} />
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
                  <NutXoa hoi="Xoá ảnh này?" className="text-[11px] text-red-500 hover:underline">Xoá</NutXoa>
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

const TRANG_THAI: Record<string, { nhan: string; mau: string }> = {
  DRAFT: { nhan: 'Bản nháp', mau: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  PENDING: { nhan: 'Chờ duyệt', mau: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  PUBLISHED: { nhan: 'Đang hiện', mau: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  ARCHIVED: { nhan: 'Đã ẩn', mau: 'bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400' },
};

/**
 * Chốt cuối trước khi game ra mặt tiền. Đặt ngay trên trợ lý AI vì đây là thứ
 * người sửa game cần biết đầu tiên: bản đang xem là nháp hay là bản khách đang
 * đọc. Nút duyệt tách riêng khỏi ô "trạng thái" trong biểu mẫu bên dưới — biểu
 * mẫu ấy lưu cả chục trường một lượt, còn đăng bài thì đáng một cú bấm rõ ràng.
 */
function ThanhDuyet({ id, trangThai, ngayDang }: { id: string; trangThai: string; ngayDang: Date | null }) {
  const tt = TRANG_THAI[trangThai] ?? TRANG_THAI.DRAFT;
  const dangHien = trangThai === 'PUBLISHED';
  const doi = async (fd: FormData) => {
    'use server';
    await setGameStatus(id, String(fd.get('sang')) as 'PUBLISHED');
  };
  return (
    <section className="card flex flex-wrap items-center gap-3 p-4">
      <div className="mr-auto">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Trạng thái</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tt.mau}`}>{tt.nhan}</span>
        </div>
        <p className="mt-1 text-xs text-ink-400">
          {dangHien
            ? ngayDang ? `Đăng ngày ${format(ngayDang, 'dd/MM/yyyy HH:mm')}` : 'Đang hiện công khai.'
            : 'Chưa hiện với người dùng. Sửa xong thì bấm “Duyệt & đăng”.'}
        </p>
      </div>
      {dangHien ? (
        <>
          <form action={doi}>
            <input type="hidden" name="sang" value="DRAFT" />
            <button type="submit" className="btn-outline !py-1.5 text-sm">Rút về nháp</button>
          </form>
          <form action={doi}>
            <input type="hidden" name="sang" value="ARCHIVED" />
            <button type="submit" className="btn !py-1.5 text-sm">Ẩn game</button>
          </form>
        </>
      ) : (
        <form action={doi}>
          <input type="hidden" name="sang" value="PUBLISHED" />
          <button type="submit" className="btn-primary !py-1.5 text-sm gap-1.5">
            <ShieldCheck size={15} /> Duyệt &amp; đăng
          </button>
        </form>
      )}
    </section>
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
