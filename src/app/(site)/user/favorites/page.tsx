import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ArrowLeft, Bookmark, MessageSquare, Eye } from 'lucide-react';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { cn, fmtCount } from '@/lib/utils';
import { gameCardSelect, toGameCard } from '@/lib/game';
import { DEFAULT_FOLDER, FOLDER_LIMIT, folderLabel } from '@/lib/favorite-folder';
import { GameGrid } from '@/components/game/GameGrid';
import { Pagination } from '@/components/Pagination';
import { UnsaveThreadButton } from '@/components/forum/UnsaveThreadButton';
import { FavoriteFolderPicker } from '@/components/user/FavoriteFolderPicker';

export const metadata: Metadata = { title: 'Đã lưu' };
export const dynamic = 'force-dynamic';
const PAGE_SIZE = 12;

const TABS = [
  { key: 'threads', label: 'Chủ đề' },
  { key: 'games', label: 'Game' },
] as const;

const when = (d: Date | null) =>
  d ? d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

export default async function FavoritesPage({ searchParams }: {
  searchParams: Promise<{ page?: string; tab?: string; folder?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login?callbackUrl=/user/favorites');
  const userId = session.user.id;
  const { page: pageRaw, tab: tabRaw, folder: folderRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? '1', 10) || 1);
  const tab = TABS.find((t) => t.key === tabRaw) ?? TABS[0];
  /** Không chọn thư mục nào = xem tất cả. */
  const folder = folderRaw?.trim() || null;

  // Danh sách thư mục lấy thẳng từ các giá trị đang có, không cần bảng riêng.
  const folderRows = await db.favorite.findMany({
    where: { userId },
    select: { folder: true },
    distinct: ['folder'],
    orderBy: { folder: 'asc' },
    // Số thư mục đã bị chặn ở FOLDER_LIMIT lúc tạo; lấy dư một chỗ cho chắc.
    take: FOLDER_LIMIT + 1,
  });
  const folders = folderRows.map((f) => f.folder);

  const scope = folder ? { folder } : {};
  const [threadTotal, gameTotal] = await Promise.all([
    db.favorite.count({ where: { userId, threadId: { not: null }, thread: { status: 'PUBLISHED' }, ...scope } }),
    db.favorite.count({ where: { userId, gameId: { not: null }, ...scope } }),
  ]);
  const total = tab.key === 'threads' ? threadTotal : gameTotal;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const skip = (page - 1) * PAGE_SIZE;

  const threads = tab.key === 'threads'
    ? (await db.favorite.findMany({
        where: { userId, threadId: { not: null }, thread: { status: 'PUBLISHED' }, ...scope },
        orderBy: { createdAt: 'desc' }, skip, take: PAGE_SIZE,
        select: {
          id: true, folder: true,
          thread: {
            select: {
              id: true, title: true, replyCount: true, viewCount: true, lastReplyAt: true,
              forum: { select: { slug: true, name: true } },
            },
          },
        },
      })).filter((f) => f.thread).map((f) => ({ favId: f.id, folder: f.folder, thread: f.thread! }))
    : [];

  const games = tab.key === 'games'
    ? (await db.favorite.findMany({
        where: { userId, gameId: { not: null }, ...scope },
        orderBy: { createdAt: 'desc' }, skip, take: PAGE_SIZE,
        select: { id: true, folder: true, game: { select: gameCardSelect } },
      })).filter((f) => f.game).map((f) => ({ favId: f.id, folder: f.folder, card: toGameCard(f.game!) }))
    : [];

  const href = (key: string, f = folder) => {
    const q = new URLSearchParams();
    if (key !== 'threads') q.set('tab', key);
    if (f) q.set('folder', f);
    const s = q.toString();
    return s ? `/user/favorites?${s}` : '/user/favorites';
  };
  const countOf = (key: string) => (key === 'threads' ? threadTotal : gameTotal);

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/user/dashboard" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> Trang cá nhân</Link>

      <div className="mb-3 flex items-center gap-2">
        <Bookmark size={22} className="text-brand-500" />
        <h1 className="text-xl font-bold text-ink-900 dark:text-white">Đã lưu</h1>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link key={t.key} href={href(t.key)}
            className={cn('rounded-full border px-3.5 py-1.5 text-sm transition-colors',
              t.key === tab.key
                ? 'border-brand-500 bg-brand-500 font-medium text-white'
                : 'border-ink-200 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800')}>
            {t.label} <span className="opacity-70">{countOf(t.key)}</span>
          </Link>
        ))}
      </div>

      {/* Thư mục — chỉ hiện khi người dùng đã tự chia, còn để mặc định thì
          hàng thẻ này chỉ tổ chiếm chỗ. */}
      {folders.length > 1 && (
        <div className="retro-sub mb-4 flex flex-wrap items-center gap-1.5">
          <span className="text-ink-400">Thư mục:</span>
          <Link href={href(tab.key, null)}
            className={cn('rounded-full border px-2.5 py-1', !folder
              ? 'border-brand-400 bg-brand-50 font-semibold text-brand-600 dark:bg-brand-950/40'
              : 'border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800')}>
            Tất cả
          </Link>
          {folders.map((f) => (
            <Link key={f} href={href(tab.key, f)}
              className={cn('rounded-full border px-2.5 py-1', folder === f
                ? 'border-brand-400 bg-brand-50 font-semibold text-brand-600 dark:bg-brand-950/40'
                : 'border-ink-200 text-ink-500 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800')}>
              {folderLabel(f)}
            </Link>
          ))}
        </div>
      )}

      {tab.key === 'games' ? (

        games.length === 0 ? (
          <div className="card p-10 text-center text-sm text-ink-500">
            {folder ? 'Thư mục này chưa có game nào.' : 'Bạn chưa lưu game nào. Mở một game rồi bấm “Lưu” để xem lại sau.'}
          </div>
        ) : (
          <div className="space-y-2">
            <GameGrid games={games.map((g) => g.card)} />
            <FolderRow items={games.map((g) => ({ favId: g.favId, folder: g.folder, title: g.card.title }))} folders={folders} />
          </div>
        )
      ) : threads.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-500">
          {folder ? 'Thư mục này chưa có chủ đề nào.' : <>Bạn chưa lưu chủ đề nào. Mở một chủ đề rồi bấm <strong>Lưu</strong> để đọc lại sau.</>}
        </div>
      ) : (
        <div className="card divide-y divide-ink-100 dark:divide-ink-800">
          {threads.map(({ favId, folder: f, thread: t }) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <Link href={`/forum/${t.forum.slug}/${t.id}`}
                  className="block truncate font-semibold text-ink-900 hover:text-brand-600 dark:text-white">
                  {t.title}
                </Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-400">
                  <Link href={`/forum/${t.forum.slug}`} className="hover:text-brand-600">{t.forum.name}</Link>
                  <span className="flex items-center gap-1"><MessageSquare size={12} />{fmtCount(t.replyCount)}</span>
                  <span className="flex items-center gap-1"><Eye size={12} />{fmtCount(t.viewCount)}</span>
                  <span>Trả lời cuối: {when(t.lastReplyAt)}</span>
                </p>
              </div>
              <FavoriteFolderPicker favoriteId={favId} current={f} folders={folders} />
              <UnsaveThreadButton threadId={t.id} title={t.title} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6"><Pagination page={page} totalPages={totalPages} basePath={href(tab.key)} /></div>
      )}
    </div>
  );
}

/**
 * Hàng chọn thư mục cho lưới thẻ.
 *
 * Thẻ chủ đề và thẻ game là component dùng chung ở nhiều trang, nhét thêm
 * nút vào trong thẻ thì trang nào cũng dính. Để riêng một hàng bên dưới lưới
 * vừa không đụng vào thẻ, vừa xếp gọn được cả chục mục.
 */
function FolderRow({ items, folders }: {
  items: { favId: string; folder: string; title: string }[];
  folders: string[];
}) {
  return (
    <div className="card flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3">
      <span className="retro-sub text-ink-400">Xếp vào thư mục:</span>
      {items.map((i) => (
        <span key={i.favId} className="flex min-w-0 items-center gap-1">
          <span className="retro-sub max-w-32 truncate text-ink-500">{i.title}</span>
          <FavoriteFolderPicker favoriteId={i.favId} current={i.folder} folders={folders} />
        </span>
      ))}
    </div>
  );
}
