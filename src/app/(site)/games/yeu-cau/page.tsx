import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft, Inbox, Gamepad2 } from 'lucide-react';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Pagination } from '@/components/Pagination';
import { GameRequestForm } from '@/components/game/GameRequestForm';
import { RequestAdminPanel, RemoveRequestButton, VoteButton } from '@/components/game/GameRequestActions';
import {
  canHandleRequests, getGameRequests, isRequestStatus,
  REQUEST_LABELS, REQUEST_STATUSES, type RequestSort, type RequestStatus,
} from '@/lib/game-request';
import { fmtAgo, fmtCount, nickClass } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Yêu cầu game',
  description: 'Xin một game mà kho chưa có, và bấm ủng hộ yêu cầu của người khác.',
};

const TABS: { key: RequestStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'Tất cả' },
  ...REQUEST_STATUSES.map((s) => ({ key: s, label: REQUEST_LABELS[s].label })),
];

export default async function GameRequestPage({ searchParams }: {
  searchParams: Promise<{ status?: string; sort?: string; page?: string }>;
}) {
  const { status: statusRaw, sort: sortRaw, page: pageRaw } = await searchParams;
  const status = statusRaw && isRequestStatus(statusRaw) ? statusRaw : 'ALL';
  const sort: RequestSort = sortRaw === 'top' ? 'top' : 'new';
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const staff = canHandleRequests(role);

  const [{ items, total, totalPages }, pending] = await Promise.all([
    getGameRequests({ viewerId, status, sort, page, role }),
    db.gameRequest.count({ where: { status: 'PENDING' } }),
  ]);

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ status, sort, ...over });
    if (p.get('status') === 'ALL') p.delete('status');
    if (p.get('sort') === 'new') p.delete('sort');
    const s = p.toString();
    return s ? `/games/yeu-cau?${s}` : '/games/yeu-cau';
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/games" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-brand-600">
        <ChevronLeft size={15} /> Kho game
      </Link>

      <div className="mt-2">
        <h1 className="flex items-center gap-2 text-xl font-bold text-ink-900 dark:text-white">
          <Inbox size={22} /> Yêu cầu game
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          Kho chưa có game bạn cần? Xin ở đây. Ai cũng muốn game đó thì bấm ủng hộ —
          yêu cầu nhiều lượt muốn được tìm trước. Đang có <b>{fmtCount(pending)}</b> yêu cầu chờ xử lý.
        </p>
      </div>

      <div className="mt-4">
        <GameRequestForm loggedIn={!!viewerId} />
      </div>

      {/* Bộ lọc */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <Link key={t.key} href={qs({ status: t.key, page: '1' })}
              className={`chip ${t.key === status
                ? 'bg-brand-500 text-white'
                : 'bg-ink-100 text-ink-600 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-300'}`}>
              {t.label}
            </Link>
          ))}
        </nav>
        <nav className="flex gap-1.5 text-sm">
          <Link href={qs({ sort: 'new', page: '1' })}
            className={sort === 'new' ? 'font-bold text-brand-600' : 'text-ink-400 hover:text-brand-600'}>Mới nhất</Link>
          <span className="text-ink-300">·</span>
          <Link href={qs({ sort: 'top', page: '1' })}
            className={sort === 'top' ? 'font-bold text-brand-600' : 'text-ink-400 hover:text-brand-600'}>Nhiều lượt muốn</Link>
        </nav>
      </div>

      {items.length === 0 ? (
        <p className="card mt-3 p-10 text-center text-sm text-ink-400">Chưa có yêu cầu nào ở mục này.</p>
      ) : (
        <ul className="card retro-stripe mt-3 divide-y divide-ink-100 dark:divide-ink-800">
          {items.map((r) => (
            <li key={r.id} className="flex items-start gap-3 p-4">
              <VoteButton id={r.id} initialVoted={r.voted} initialCount={r.voteCount}
                disabled={!viewerId || r.status === 'DONE' || r.status === 'REJECTED'} />

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-ink-800 dark:text-ink-100">{r.title}</span>
                  <span className={`chip ${REQUEST_LABELS[r.status].chip}`}>{REQUEST_LABELS[r.status].label}</span>
                </p>

                {r.note && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-600 dark:text-ink-300">{r.note}</p>
                )}

                <p className="retro-sub mt-1 text-ink-400">
                  <Link href={`/u/${r.user.username ?? ''}`} className={`font-bold hover:underline ${nickClass(r.user.role)}`}>
                    {r.user.name ?? r.user.username}
                  </Link>
                  {' '}Lv{r.user.level} · {fmtAgo(r.createdAt)}
                </p>

                {/* Game đã lên kho — thứ người xin chờ nhất, nên để thành nút. */}
                {r.game && (
                  <Link href={`/games/${r.game.slug}`}
                    className="btn-outline mt-2 !py-1 text-xs">
                    <Gamepad2 size={14} /> {r.game.title}
                  </Link>
                )}

                {r.adminNote && (
                  <p className="retro-rule mt-2 pt-2 text-sm text-ink-500 dark:text-ink-400">
                    <b className="text-ink-400">Người quản kho:</b> {r.adminNote}
                  </p>
                )}

                {staff && (
                  <RequestAdminPanel id={r.id} status={r.status} adminNote={r.adminNote}
                    gameSlug={r.game?.slug ?? null} />
                )}
              </div>

              {r.canRemove && (
                <div className="shrink-0"><RemoveRequestButton id={r.id} /></div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Pagination page={page} totalPages={totalPages} basePath={qs({})} />

      {total > 0 && (
        <p className="retro-sub mt-3 text-center text-ink-400">{fmtCount(total)} yêu cầu</p>
      )}
    </div>
  );
}
