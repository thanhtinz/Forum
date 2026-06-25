'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Pin, Lock, HelpCircle, BarChart2, BookOpen, Lightbulb, CheckCircle2, SlidersHorizontal, MessageSquare } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { Avatar } from './Header';
import { useAuth } from './AuthProvider';
import type { Paginated, Thread, ThreadType } from '@/lib/types';

const THREAD_TYPE_ICONS: Partial<Record<ThreadType, React.ReactNode>> = {
  QUESTION:   <HelpCircle  size={12} className="shrink-0 text-blue-500" />,
  POLL:       <BarChart2   size={12} className="shrink-0 text-violet-500" />,
  ARTICLE:    <BookOpen    size={12} className="shrink-0 text-emerald-500" />,
  SUGGESTION: <Lightbulb  size={12} className="shrink-0 text-amber-500" />,
};

function formatLastPost(d?: string) {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isToday(date)) return `Lúc ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `Hôm qua ${format(date, 'HH:mm')}`;
    return `Lúc ${format(date, 'HH:mm, EEEE', { locale: vi })}`;
  } catch { return ''; }
}

function timeAgo(d?: string) {
  if (!d) return '';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: vi }); } catch { return ''; }
}

const SORT_OPTIONS = [
  { value: 'lastPost', label: 'Bài mới nhất' },
  { value: 'createdAt', label: 'Mới đăng nhất' },
  { value: 'replyCount', label: 'Nhiều trả lời' },
  { value: 'viewCount', label: 'Nhiều lượt xem' },
];

const POST_PER_PAGE = 20;

export function ThreadList({ categoryId, hideHeader }: { categoryId?: string; hideHeader?: boolean } = {}) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('lastPost');
  const [sortOpen, setSortOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const params = new URLSearchParams({ limit: String(POST_PER_PAGE), sortBy, page: String(page) });
  if (categoryId) params.set('categoryId', categoryId);

  const { data, error, isLoading } = useSWR<Paginated<Thread>>(`/forum/threads?${params}`, fetcher);
  const totalPages = data?.meta?.totalPages ?? 1;

  useEffect(() => {
    if (!user || !data?.data?.length) return;
    api.post<Record<string, number>>('/forum/read-progress/bulk', { threadIds: data.data.map((t) => t.id) })
      .then(setUnreadCounts).catch(() => {});
  }, [user, data]);

  const currentSort = SORT_OPTIONS.find((o) => o.value === sortBy) ?? SORT_OPTIONS[0];

  return (
    <section className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
        {!hideHeader && <h2 className="font-semibold">Bài viết mới nhất</h2>}
        {hideHeader && <span />}
        <div className="flex items-center gap-2">
          {/* Sort filter */}
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800"
            >
              <SlidersHorizontal size={13} />
              {currentSort.label}
              <span className="text-ink-400">▾</span>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-card dark:border-ink-800 dark:bg-ink-900">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setSortOpen(false); setPage(1); }}
                    className={`flex w-full items-center px-4 py-2 text-sm hover:bg-ink-50 dark:hover:bg-ink-800 ${sortBy === opt.value ? 'font-semibold text-brand-600' : 'text-ink-700 dark:text-ink-300'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {user && (
            <button
              onClick={async () => { await api.post('/forum/read-progress/mark-all', {}); setUnreadCounts({}); }}
              className="rounded-lg px-2.5 py-1.5 text-xs text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              Đọc hết
            </button>
          )}
          <Link href="/threads/new" className="btn-primary !py-1.5 !px-3 text-xs">+ Đăng bài</Link>
        </div>
      </div>

      {isLoading && <div className="p-8 text-center text-ink-500">Đang tải…</div>}
      {error && <div className="p-8 text-center text-red-500">Không tải được dữ liệu.</div>}
      {data && data.data.length === 0 && (
        <div className="p-10 text-center text-ink-500">Chưa có bài viết nào.</div>
      )}

      <ul className="divide-y divide-ink-100 dark:divide-ink-800">
        {data?.data.map((t) => {
          const unread    = unreadCounts[t.id];
          const hasUnread = typeof unread === 'number' && unread > 0;
          const typeIcon  = t.threadType ? THREAD_TYPE_ICONS[t.threadType] : null;

          return (
            <li key={t.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-ink-50/60 dark:hover:bg-ink-800/30">
              {/* Avatar */}
              <Link href={`/thread?slug=${t.slug}`} className="mt-0.5 shrink-0">
                <Avatar user={t.author ?? { username: '?' }} size={44} />
              </Link>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Prefix + type chips */}
                <div className="mb-1 flex flex-wrap items-center gap-1">
                  {t.isPinned && <Pin size={12} className="text-amber-500" />}
                  {t.isLocked && <Lock size={12} className="text-ink-400" />}
                  {typeIcon}
                  {t.bestAnswerId && <CheckCircle2 size={12} className="text-emerald-500" />}
                  {t.prefixRef && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[11px] font-bold text-white"
                      style={{ backgroundColor: t.prefixRef.color || '#6366f1' }}
                    >
                      {t.prefixRef.label}
                    </span>
                  )}
                  {hasUnread && (
                    <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unread} mới
                    </span>
                  )}
                </div>

                {/* Title */}
                <Link
                  href={`/thread?slug=${t.slug}`}
                  className={`block leading-snug font-semibold hover:text-brand-600 ${hasUnread ? 'text-ink-900 dark:text-white' : 'text-ink-800 dark:text-ink-100'}`}
                >
                  {t.title}
                </Link>

                {/* Tags */}
                {t.tags && t.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.tags.slice(0, 3).map((tt) => (
                      <Link
                        key={tt.tag.id}
                        href={`/tag?slug=${tt.tag.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: tt.tag.color ? tt.tag.color + '22' : '#6366f122', color: tt.tag.color || '#6366f1' }}
                      >
                        #{tt.tag.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Meta row */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-400">
                  <span className="font-medium text-ink-500">{t.author?.displayName || t.author?.username}</span>
                  {t.category && !categoryId && (
                    <>
                      <span>·</span>
                      <span className="text-brand-500">{t.category.name}</span>
                    </>
                  )}
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <MessageSquare size={11} className="text-ink-400" />
                    Trả lời {t.replyCount}
                  </span>
                  {t.lastPostAt && (
                    <>
                      <span>·</span>
                      <span>{formatLastPost(t.lastPostAt)}</span>
                    </>
                  )}
                  {/* Page links for long threads */}
                  {t.replyCount >= POST_PER_PAGE && (() => {
                    const pages = Math.ceil((t.replyCount + 1) / POST_PER_PAGE);
                    const shown = pages > 4 ? [1, 2, null, pages] : Array.from({ length: pages }, (_, i) => i + 1);
                    return (
                      <span className="flex items-center gap-0.5">
                        <span className="text-ink-300">·</span>
                        <span className="text-[10px]">Trang:</span>
                        {shown.map((pg, i) => pg === null
                          ? <span key={`s${i}`} className="text-ink-300">…</span>
                          : <Link key={pg} href={`/thread?slug=${t.slug}&page=${pg}`} onClick={(e) => e.stopPropagation()}
                              className="rounded px-1 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-700"
                            >{pg}</Link>
                        )}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Reply count — right side on md+ */}
              <div className="hidden shrink-0 flex-col items-center gap-0.5 pt-1 sm:flex">
                <span className="text-sm font-bold text-ink-700 dark:text-ink-200">{t.replyCount}</span>
                <span className="text-[10px] text-ink-400">trả lời</span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-ink-200/70 px-4 py-3 dark:border-ink-800">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800">
            ← Trước
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = totalPages <= 7 ? i + 1 : i === 0 ? 1 : i === 6 ? totalPages : page - 2 + i;
              if (pg < 1 || pg > totalPages) return null;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`h-7 min-w-[28px] rounded px-1.5 text-xs font-medium transition ${pg === page ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'}`}>
                  {pg}
                </button>
              );
            })}
          </div>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || isLoading}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800">
            Sau →
          </button>
        </div>
      )}
    </section>
  );
}
