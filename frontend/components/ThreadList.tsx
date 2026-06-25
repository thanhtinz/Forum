'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Pin, Lock, MessageCircle, Eye, ThumbsUp, Flame, Sparkles } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { Avatar } from './Header';
import { useAuth } from './AuthProvider';
import type { Paginated, Thread } from '@/lib/types';

const PREFIX_STYLE: Record<string, string> = {
  FREE: 'bg-emerald-100 text-emerald-700',
  PAID: 'bg-amber-100 text-amber-700',
  GUIDE: 'bg-sky-100 text-sky-700',
  SHOWCASE: 'bg-fuchsia-100 text-fuchsia-700',
  REQUEST: 'bg-orange-100 text-orange-700',
  ANNOUNCEMENT: 'bg-red-100 text-red-700',
  DISCUSSION: 'bg-ink-200 text-ink-700',
};

type SortBy = 'lastPost' | 'createdAt' | 'views' | 'likes' | 'replies';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'lastPost', label: 'Hoạt động' },
  { value: 'createdAt', label: 'Mới nhất' },
  { value: 'replies', label: 'Trả lời' },
  { value: 'views', label: 'Lượt xem' },
  { value: 'likes', label: 'Lượt thích' },
];

function timeAgo(d?: string) {
  if (!d) return '';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: vi }); } catch { return ''; }
}

function isHot(t: Thread) {
  return t.replyCount >= 15 || t.viewCount >= 300;
}

function isNew(t: Thread) {
  if (!t.createdAt) return false;
  const age = Date.now() - new Date(t.createdAt).getTime();
  return age < 48 * 60 * 60 * 1000;
}

export function ThreadList({ categoryId, hideHeader }: { categoryId?: string; hideHeader?: boolean } = {}) {
  const { user } = useAuth();
  const [sort, setSort] = useState<SortBy>('lastPost');
  const [unanswered, setUnanswered] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ limit: '20', sortBy: sort, page: String(page) });
  if (categoryId) params.set('categoryId', categoryId);
  if (unanswered) params.set('unanswered', '1');
  if (prefix) params.set('prefix', prefix);
  const url = `/forum/threads?${params.toString()}`;

  const { data, error, isLoading } = useSWR<Paginated<Thread>>(url, fetcher);
  const totalPages = data?.meta?.totalPages ?? 1;
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!user || !data?.data?.length) return;
    const threadIds = data.data.map((t) => t.id);
    api.post<Record<string, number>>('/forum/read-progress/bulk', { threadIds })
      .then(setUnreadCounts)
      .catch(() => {});
  }, [user, data]);

  return (
    <section className="card overflow-hidden">
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
          <h2 className="font-semibold">Bài viết mới nhất</h2>
          <Link href="/threads/new" className="btn-primary !py-1.5 !px-3 text-xs">+ Đăng bài</Link>
        </div>
      )}

      {/* Sort / Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-200/70 px-4 py-2 dark:border-ink-800">
        <div className="flex flex-wrap items-center gap-1">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => { setSort(o.value); setPage(1); }}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${sort === o.value ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {Object.entries(PREFIX_STYLE).map(([key, cls]) => (
            <button
              key={key}
              onClick={() => { setPrefix(prefix === key ? '' : key); setPage(1); }}
              className={`chip text-[11px] transition ${prefix === key ? cls + ' ring-2 ring-offset-1 ring-brand-400' : cls + ' opacity-60 hover:opacity-100'}`}
            >
              {key}
            </button>
          ))}
          <button
            onClick={() => { setUnanswered((v) => !v); setPage(1); }}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${unanswered ? 'bg-amber-500 text-white' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'}`}
          >
            Chưa trả lời
          </button>
        </div>
      </div>

      {isLoading && <div className="p-8 text-center text-ink-500">Đang tải…</div>}
      {error && <div className="p-8 text-center text-red-500">Không tải được dữ liệu (kiểm tra API).</div>}
      {data && data.data.length === 0 && (
        <div className="p-10 text-center text-ink-500">
          {unanswered ? 'Không có bài viết nào chưa được trả lời.' : 'Chưa có bài viết nào. Hãy là người đầu tiên!'}
        </div>
      )}

      <ul className="divide-y divide-ink-200/70 dark:divide-ink-800">
        {data?.data.map((t) => {
          const unread = unreadCounts[t.id];
          const hasUnread = typeof unread === 'number' && unread > 0;
          const hot = isHot(t);
          const fresh = isNew(t);
          return (
            <li key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
              {t.author && <Avatar user={t.author} size={40} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {hasUnread && (
                    <span className="inline-flex h-5 items-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white" title={`${unread} bài mới`}>
                      {unread} mới
                    </span>
                  )}
                  {hot && !hasUnread && (
                    <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      <Flame size={9} /> HOT
                    </span>
                  )}
                  {fresh && !hot && !hasUnread && (
                    <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">
                      <Sparkles size={9} /> MỚI
                    </span>
                  )}
                  {t.isPinned && <Pin size={14} className="text-amber-500" />}
                  {t.isLocked && <Lock size={14} className="text-ink-400" />}
                  {(t as any).prefixRef ? (
                    <span className="chip text-white" style={{ backgroundColor: (t as any).prefixRef.color || '#6366f1' }}>{(t as any).prefixRef.label}</span>
                  ) : t.prefix && t.prefix !== 'NONE' ? (
                    <span className={`chip ${PREFIX_STYLE[t.prefix] || 'bg-ink-200 text-ink-700'}`}>{t.prefix}</span>
                  ) : null}
                  <Link href={`/thread?slug=${t.slug}`} className={`truncate font-semibold hover:text-brand-600 dark:text-ink-100 ${hasUnread ? 'text-ink-900 dark:text-white' : 'text-ink-800'}`}>
                    {t.title}
                  </Link>
                </div>
                <div className="mt-0.5 text-xs text-ink-500">
                  {t.author?.displayName || t.author?.username || 'Ẩn danh'} · {timeAgo(t.createdAt)}
                  {t.category && <> · trong <span className="text-brand-600">{t.category.name}</span></>}
                </div>
                {t.tags && t.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.tags.slice(0, 4).map((tt) => (
                      <Link key={tt.tag.id} href={`/tag?slug=${tt.tag.slug}`} onClick={(e) => e.stopPropagation()}
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: tt.tag.color ? tt.tag.color + '22' : undefined, color: tt.tag.color || undefined }}
                      >
                        #{tt.tag.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="hidden shrink-0 flex-col items-end gap-0.5 text-xs text-ink-500 sm:flex">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><MessageCircle size={13} /> {t.replyCount}</span>
                  <span className="flex items-center gap-1"><Eye size={13} /> {t.viewCount}</span>
                  <span className="flex items-center gap-1"><ThumbsUp size={13} /> {t.likeCount}</span>
                </div>
                {t.lastPostAt && t.replyCount > 0 && (
                  <span className="text-[11px] text-ink-400">{timeAgo(t.lastPostAt)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-ink-200/70 px-4 py-3 dark:border-ink-800">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800"
          >
            ← Trước
          </button>
          <span className="text-xs text-ink-500">Trang {page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800"
          >
            Sau →
          </button>
        </div>
      )}
    </section>
  );
}
