import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';
import { ChevronLeft, Cpu, Download, Info, Smartphone } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isMobileRequest } from '@/lib/device';
import { ORIENTATION_LABEL } from '@/lib/game';
import { resolveProfile } from '@/lib/emulator';
import { cn } from '@/lib/utils';
import { EmulatorStage } from '@/components/game/EmulatorStage';

export const dynamic = 'force-dynamic';

/** `viewport-fit=cover` để emulator tràn tới sát mép máy có tai thỏ. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f1115',
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await db.game.findUnique({ where: { slug }, select: { title: true } });
  return { title: game ? `Chơi ${game.title}` : 'Chơi game', robots: { index: false } };
}

export default async function PlayGamePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ version?: string; profile?: string; force?: string }>;
}) {
  const [{ slug }, sp, session, mobile] = await Promise.all([params, searchParams, auth(), isMobileRequest()]);
  const userId = session?.user?.id ?? null;

  // Emulator chỉ mở trên điện thoại. `?force=1` là lối thoát cho máy thật bị
  // nhận diện nhầm (trình duyệt bật chế độ desktop) — không quảng cáo ở nơi khác.
  const allowed = mobile || sp.force === '1';

  const game = await db.game.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      id: true, slug: true, title: true, titleVi: true, playOnline: true,
      versions: {
        where: { playOnline: true },
        orderBy: [{ latest: 'desc' }, { releaseDate: 'desc' }],
        select: { id: true, version: true, latest: true },
      },
    },
  });
  if (!game) notFound();

  const playable = game.playOnline && game.versions.length > 0;
  const version = sp.version
    ? game.versions.find((v) => v.id === sp.version) ?? game.versions[0]
    : game.versions[0];

  // Profile + keymap đã lưu của người dùng để nạp sẵn vào emulator.
  const profile = playable && version ? await resolveProfile(game.id, version.id, sp.profile) : null;

  // Thư viện máy ảo cho người chơi chọn, kèm mức tương thích với chính game này.
  const [allProfiles, matrix] = playable && version
    ? await Promise.all([
        db.emulatorProfile.findMany({
          where: { active: true },
          orderBy: [{ vendor: 'asc' }, { screenWidth: 'asc' }, { name: 'asc' }],
          select: { id: true, slug: true, name: true, vendor: true, screenWidth: true, screenHeight: true, cldc: true, midp: true },
        }),
        db.gameEmulatorProfile.findMany({
          where: { gameId: game.id, OR: [{ versionId: version.id }, { versionId: null }] },
          select: { profileId: true, support: true },
        }),
      ])
    : [[], []];

  const supportOf = new Map(matrix.map((m) => [m.profileId, m.support]));
  const devices = allProfiles.map((p) => ({ ...p, support: supportOf.get(p.id) ?? null }));
  const savedKeymap = userId && profile
    ? (await db.userKeymap.findUnique({
        where: { userId_profileId: { userId, profileId: profile.id } },
        select: { mapping: true },
      }))?.mapping as Record<string, string> | undefined
    : undefined;

  // Khi emulator phủ kín màn hình (điện thoại), khung của trang — link quay lại,
  // chọn version, ghi chú — bị che hoàn toàn nên không render nữa. Bám theo
  // `mobile` chứ không theo bề ngang: xoay ngang máy vẫn là toàn màn hình.
  const stageFullscreen = mobile && playable && !!version;

  return (
    // `space-y-*` đặt margin-top lên cả phần tử `fixed`, làm sân khấu toàn màn
    // hình lệch khỏi mép trên — nên tắt hẳn khoảng cách này khi đang toàn màn hình.
    <div className={cn('mx-auto max-w-3xl', !stageFullscreen && 'space-y-4')}>
      <div className={cn('items-center justify-between gap-2', stageFullscreen ? 'hidden' : 'flex')}>
        <Link href={`/games/${game.slug}`} className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
          <ChevronLeft size={15} /> Về trang game
        </Link>
        {game.versions.length > 1 && version && (
          <div className="flex flex-wrap gap-1.5">
            {game.versions.map((v) => (
              <Link
                key={v.id}
                href={`/games/${game.slug}/play?version=${v.id}`}
                className={`chip border text-xs ${v.id === version.id
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-ink-200 text-ink-500 hover:border-brand-400 dark:border-ink-700'}`}
              >
                v{v.version}
              </Link>
            ))}
          </div>
        )}
      </div>

      {!allowed ? (
        <div className="card p-8 text-center sm:p-10">
          <Smartphone className="mx-auto text-brand-500" size={38} />
          <p className="mt-3 text-lg font-bold">Chơi online chỉ có trên điện thoại</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            Game Java ME làm cho màn hình dọc nhỏ và bàn phím số, nên emulator chỉ mở trên điện thoại.
            Hãy mở đường dẫn này bằng đt, hoặc tải JAR/JAD về máy thật để chơi.
          </p>
          <p className="mx-auto mt-3 max-w-md break-all rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-500 dark:bg-ink-800/60">
            /games/{game.slug}/play
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href={`/games/${game.slug}#download`} className="btn-primary">
              <Download size={16} /> Tải game về
            </Link>
            <Link href={`/games/${game.slug}`} className="btn-outline">Xem thông tin game</Link>
          </div>
          <p className="mt-4 text-[11px] text-ink-400">
            Đang dùng điện thoại mà vẫn thấy màn hình này?{' '}
            <Link href={`/games/${game.slug}/play?force=1`} className="text-brand-600 hover:underline">Mở emulator</Link>
          </p>
        </div>
      ) : !playable || !version ? (
        <div className="card p-10 text-center">
          <Cpu className="mx-auto text-ink-300" size={34} />
          <p className="mt-3 font-bold">Game này chưa hỗ trợ chơi online</p>
          <p className="mt-1 text-sm text-ink-500">
            Chưa có phiên bản nào được đánh dấu Play Online Compatible. Bạn vẫn tải JAR/JAD về máy thật để chơi.
          </p>
          <Link href={`/games/${game.slug}#download`} className="btn-primary mt-4">
            <Download size={16} /> Tải game về
          </Link>
        </div>
      ) : (
        <>
          <EmulatorStage
            slug={game.slug}
            gameTitle={game.titleVi ?? game.title}
            versionId={version.id}
            profileId={sp.profile}
            savedKeymap={savedKeymap ?? null}
            loggedIn={!!userId}
            fullscreen={mobile}
            devices={devices}
          />

          <div className={cn('card p-4 text-sm text-ink-500', stageFullscreen ? 'hidden' : 'block')}>
            <p className="flex items-start gap-2">
              <Info size={15} className="mt-0.5 shrink-0 text-brand-500" />
              <span>
                Dùng phím mũi tên hoặc W/A/S/D để di chuyển, Enter/Space là phím OK, Q/E là hai phím mềm.
                Trên điện thoại hãy dùng bàn phím ảo bên dưới màn hình.
                {profile && (
                  <> Thiết bị ảo: <b>{profile.name}</b> — {profile.screenWidth}×{profile.screenHeight},{' '}
                  {ORIENTATION_LABEL[profile.orientation].toLowerCase()}, CLDC {profile.cldc} / MIDP {profile.midp}.</>
                )}
              </span>
            </p>
            <p className="mt-2 text-xs text-ink-400">
              Phiên chơi tự đóng khi hết thời gian hoặc khi bạn rời trang. Tiến trình được lưu qua RMS
              {userId ? ' và đồng bộ theo tài khoản' : ' trong trình duyệt của bạn (đăng nhập để lưu lên tài khoản)'}.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
