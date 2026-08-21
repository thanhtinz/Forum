import Link from 'next/link';
import { MessagesSquare } from 'lucide-react';
import { fmtCount, fmtAgo } from '@/lib/utils';
import { FORUM_ACCESS_BADGE, forumTint } from '@/lib/forum';
import { TableHead } from './TableHead';

export interface BoardRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  postAccess: keyof typeof FORUM_ACCESS_BADGE;
  vipOnly: boolean;
  threadCount: number;
  replyCount: number;
  latest: { id: string; title: string; at: Date; author: string | null } | null;
}

export interface BoardSection {
  id: string;
  name: string;
  icon: string | null;
  boards: BoardRow[];
}

/**
 * Danh sách chuyên mục kiểu bảng diễn đàn: cột số liệu bên phải dùng đúng
 * bề rộng với bảng chủ đề (w-16 / w-20) để các khối thẳng hàng với nhau.
 */
export function BoardList({ sections }: { sections: BoardSection[] }) {
  if (sections.length === 0) {
    return <div className="card p-10 text-center text-sm text-ink-400">Chưa có chuyên mục nào.</div>;
  }

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <section key={s.id} className="card overflow-hidden">
          <TableHead
            title={s.name}
            icon={<span aria-hidden className="text-base leading-none">{s.icon ?? '📁'}</span>}
            cols={{ last: 'Mới nhất', a: 'Chủ đề', b: 'Bài' }}
          />

          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {s.boards.map((b) => <BoardRowView key={b.id} board={b} />)}
            {s.boards.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-400">Chưa có mục con.</p>}
          </div>
        </section>
      ))}
    </div>
  );
}

function BoardRowView({ board }: { board: BoardRow }) {
  const badge = FORUM_ACCESS_BADGE[board.postAccess];
  const tint = forumTint(board.slug);

  return (
    <div className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-ink-50 sm:px-4 dark:hover:bg-ink-800/50">
      <Link href={`/forum/${board.slug}`} className="grid size-10 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `${tint}1f`, color: tint }}>
        {board.icon ?? <MessagesSquare size={18} />}
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/forum/${board.slug}`} className="truncate font-semibold text-ink-900 group-hover:text-brand-600 dark:text-white">
            {board.name}
          </Link>
          {badge && <span className={`chip ${badge.className}`}>{badge.label}</span>}
        </div>

        {board.description && <p className="mt-0.5 line-clamp-1 text-xs text-ink-400">{board.description}</p>}

        {/* Trên màn hình hẹp thì gộp số liệu vào dòng meta */}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-400 sm:hidden">
          <span>{fmtCount(board.threadCount)} chủ đề</span>
          <span>·</span>
          <span>{fmtCount(board.replyCount)} bài</span>
          {board.latest && <><span>·</span><span>{fmtAgo(board.latest.at)}</span></>}
        </p>
      </div>

      {/* Bài mới nhất */}
      <div className="hidden w-40 shrink-0 text-xs lg:block">
        {board.latest ? (
          <>
            <Link href={`/forum/${board.slug}/${board.latest.id}`} className="line-clamp-1 font-medium text-ink-700 hover:text-brand-600 dark:text-ink-200">
              {board.latest.title}
            </Link>
            <p className="mt-0.5 truncate text-ink-400">
              {board.latest.author ? `@${board.latest.author}` : 'Ẩn danh'} · {fmtAgo(board.latest.at)}
            </p>
          </>
        ) : (
          <p className="text-ink-300 dark:text-ink-600">Chưa có bài</p>
        )}
      </div>

      {/* Cột số liệu — cùng bề rộng với bảng chủ đề */}
      <div className="hidden w-16 shrink-0 text-center text-sm font-bold text-ink-700 sm:block dark:text-ink-100">
        {fmtCount(board.threadCount)}
      </div>
      <div className="hidden w-20 shrink-0 text-center text-sm font-bold text-ink-700 md:block dark:text-ink-100">
        {fmtCount(board.replyCount)}
      </div>
    </div>
  );
}
