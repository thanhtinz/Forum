import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft, Cpu, Download, Info } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { ORIENTATION_LABEL } from '@/lib/game';
import { resolveProfile } from '@/lib/emulator';
import { EmulatorStage } from '@/components/game/EmulatorStage';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const game = await db.game.findUnique({ where: { slug }, select: { title: true } });
  return { title: game ? `Chơi ${game.title}` : 'Chơi game', robots: { index: false } };
}

export default async function PlayGamePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ version?: string; profile?: string }>;
}) {
  const [{ slug }, sp, session] = await Promise.all([params, searchParams, auth()]);
  const userId = session?.user?.id ?? null;

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
  const profile = playable && version ? await resolveProfile(game.id, version.id) : null;
  const savedKeymap = userId && profile
    ? (await db.userKeymap.findUnique({
        where: { userId_profileId: { userId, profileId: profile.id } },
        select: { mapping: true },
      }))?.mapping as Record<string, string> | undefined
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
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

      {!playable || !version ? (
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
          />

          <div className="card p-4 text-sm text-ink-500">
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
