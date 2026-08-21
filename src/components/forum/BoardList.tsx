import Link from 'next/link';
import { MessagesSquare, ChevronRight } from 'lucide-react';
import { fmtCount, fmtAgo } from '@/lib/utils';
import { FORUM_ACCESS_BADGE, forumTint } from '@/lib/forum';

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
 * Danh sách chuyên mục kiểu diễn đàn wap: mỗi mục một hàng gọn,
 * bên phải là số chủ đề/bài và bài mới nhất.
 */
export function BoardList({ sections }: { sections: BoardSection[] }) {
  if (sections.length === 0) {
    return <div className="card p-10 text-center text-sm text-ink-400">Chưa có chuyên mục nào.</div>;
  }

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <section key={s.id} className="card overflow-hidden">
          <header className="flex items-center gap-2 border-b border-ink-100 bg-ink-50/70 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-900/60">
            <span aria-hidden className="text-base leading-none">{s.icon ?? '📁'}</span>
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-700 dark:text-ink-200">{s.name}</h2>
            <span className="ml-auto text-xs text-ink-400">{s.boards.length} mục</span>
          </header>

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
    <div className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-ink-50 sm:px-4 dark:hover:bg-ink-800/50">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl text-xl" style={{ background: `${tint}1f`, color: tint }}>
        {board.icon ?? <MessagesSquare size={18} />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/forum/${board.slug}`} className="truncate font-semibold text-ink-900 group-hover:text-brand-600 dark:text-white">
            {board.name}
          </Link>
          {badge && <span className={`chip ${badge.className}`}>{badge.label}</span>}
        </div>

        {board.description && <p className="mt-0.5 line-clamp-1 text-xs text-ink-400">{board.description}</p>}

        <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-400 sm:hidden">
          <span>{fmtCount(board.threadCount)} chủ đề</span>
          <span>·</span>
          <span>{fmtCount(board.replyCount)} bài</span>
          {board.latest && <><span>·</span><span>{fmtAgo(board.latest.at)}</span></>}
        </p>
      </div>

      {/* Cột số liệu — chỉ hiện từ sm trở lên, giống bảng diễn đàn cổ điển */}
      <div className="hidden w-24 shrink-0 text-center text-xs leading-tight text-ink-400 sm:block">
        <div><b className="text-sm text-ink-700 dark:text-ink-200">{fmtCount(board.threadCount)}</b> chủ đề</div>
        <div><b className="text-sm text-ink-700 dark:text-ink-200">{fmtCount(board.replyCount)}</b> bài</div>
      </div>

      {/* Bài mới nhất */}
      <div className="hidden w-52 shrink-0 text-xs md:block">
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

      <ChevronRight size={16} className="shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
    </div>
  );
}
