import Link from 'next/link';
import { Apple, Coffee, Download, Eye, Gamepad2, Globe, Monitor, Smartphone, Terminal } from 'lucide-react';
import type { GameCardData } from '@/lib/game';
import { DOWNLOAD_PLATFORMS, gameTint, LANGUAGE_LABEL } from '@/lib/game';
import { cn, fmtBytes, fmtCount } from '@/lib/utils';
import { RatingStars } from './RatingStars';

const PLATFORM_ICON = { Monitor, Apple, Terminal, Smartphone, Globe, Coffee } as const;

export interface GameCardProps {
  game: GameCardData;
  /** `compact` dùng cho hàng cuộn ngang, `list` cho kết quả tìm kiếm. */
  variant?: 'grid' | 'compact' | 'list';
}

/**
 * Thẻ game dùng chung: icon, tên, thể loại, rating, lượt xem/tải, version,
 * dung lượng, ngôn ngữ, độ phân giải, platform, badge và nút tải về.
 */
export function GameCard({ game, variant = 'grid' }: GameCardProps) {
  const tint = gameTint(game.slug);
  const href = `/games/${game.slug}`;

  if (variant === 'compact') {
    return (
      <Link href={href} className="post-card w-36 shrink-0 p-3 sm:w-40">
        <GameIcon game={game} tint={tint} size={64} className="mx-auto" />
        <p className="mt-2 line-clamp-2 text-center text-sm font-semibold leading-snug">{game.title}</p>
        <p className="mt-0.5 text-center text-[11px] text-ink-400">
          {game.genres[0]?.name ?? 'Java ME'} · {fmtCount(game.downloadCount)} lượt tải
        </p>
      </Link>
    );
  }

  const meta = (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
      <Platforms game={game} />
      {game.version && <span>v{game.version}</span>}
      {game.sizeBytes != null && <span>{fmtBytes(game.sizeBytes)}</span>}
      {game.resolution && <span>{game.resolution}</span>}
      {game.platform && <span className="truncate">{game.platform}</span>}
      <span>{LANGUAGE_LABEL[game.language] ?? game.language}</span>
    </div>
  );

  const stats = (
    <div className="flex items-center gap-3 text-[11px] text-ink-400">
      <span className="flex items-center gap-1"><Eye size={12} />{fmtCount(game.viewCount)}</span>
      <span className="flex items-center gap-1"><Download size={12} />{fmtCount(game.downloadCount)}</span>
      {game.ratingCount > 0 && (
        <span className="flex items-center gap-1">
          <RatingStars value={game.rating} size={11} />
          <b className="font-semibold text-ink-500">{game.rating.toFixed(1)}</b>
        </span>
      )}
    </div>
  );

  if (variant === 'list') {
    return (
      <article className="post-card flex-row items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <Link href={href}><GameIcon game={game} tint={tint} size={64} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link href={href} className="truncate font-bold hover:text-brand-600">{game.title}</Link>
            <Badges game={game} />
          </div>
          {game.titleVi && <p className="truncate text-xs text-ink-500">{game.titleVi}</p>}
          <div className="mt-1 space-y-1">{meta}{stats}</div>
        </div>
        <Actions game={game} className="hidden shrink-0 flex-col gap-1.5 sm:flex" />
      </article>
    );
  }

  return (
    <article className="post-card p-3.5">
      <div className="flex items-start gap-3">
        <Link href={href}><GameIcon game={game} tint={tint} size={56} /></Link>
        <div className="min-w-0 flex-1">
          <Link href={href} className="line-clamp-1 font-bold leading-tight hover:text-brand-600">{game.title}</Link>
          <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">
            {game.titleVi ?? game.genres.map((g) => g.name).join(', ') ?? 'Java ME'}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1"><Badges game={game} /></div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-ink-100 pt-2.5 dark:border-ink-800">
        {meta}
        {stats}
      </div>

      <Actions game={game} className="mt-3 grid grid-cols-2 gap-2" />
    </article>
  );
}

function GameIcon({ game, tint, size, className }: { game: GameCardData; tint: string; size: number; className?: string }) {
  return game.icon ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={game.icon}
      alt={game.title}
      loading="lazy"
      width={size}
      height={size}
      className={cn('shrink-0 rounded-xl object-cover', className)}
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
    />
  ) : (
    <span
      className={cn('grid shrink-0 place-items-center rounded-xl', className)}
      style={{ width: size, height: size, background: `${tint}1f`, color: tint }}
    >
      <Gamepad2 size={size * 0.45} />
    </span>
  );
}

/** Dãy icon nền tảng có bản tải — cho biết game chạy ở đâu ngay từ danh sách. */
function Platforms({ game }: { game: GameCardData }) {
  if (game.downloads.length === 0) return null;
  return (
    <span className="flex items-center gap-1 text-ink-500">
      {game.downloads.map((p) => {
        const meta = DOWNLOAD_PLATFORMS[p];
        const Icon = PLATFORM_ICON[meta.icon];
        return <Icon key={p} size={12} aria-label={meta.label} />;
      })}
    </span>
  );
}

function Badges({ game }: { game: GameCardData }) {
  if (game.badges.length === 0) return null;
  return (
    <>
      {game.badges.map((b) => (
        <span key={b.label} className={`chip !px-2 !py-0 text-[10px] ${b.className}`}>{b.label}</span>
      ))}
    </>
  );
}

function Actions({ game, className }: { game: GameCardData; className?: string }) {
  return (
    <div className={className}>
      <Link href={`/games/${game.slug}`} className="btn-outline !px-3 !py-1.5 text-xs">
        Chi tiết
      </Link>
      <Link href={`/games/${game.slug}#download`} className="btn-primary !px-3 !py-1.5 text-xs">
        <Download size={13} /> Tải về
      </Link>
    </div>
  );
}
