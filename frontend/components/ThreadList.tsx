'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Pin, Lock, MessageCircle, Eye, ThumbsUp, Flame, Sparkles, CheckCircle2, ArrowRight, HelpCircle, BarChart2, BookOpen, Lightbulb } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { Avatar } from './Header';
import { useAuth } from './AuthProvider';
import type { Paginated, Thread, ThreadPrefix, ThreadType } from '@/lib/types';

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

function isHot(t: Thread) { return t.replyCount >= 15 || t.viewCount >= 300; }
function isNew(t: Thread) {
  if (!t.createdAt) return false;
  return Date.now() - new Date(t.createdAt).getTime() < 48 * 60 * 60 * 1000;
}

function PrefixChip({ prefix }: { prefix: ThreadPrefix }) {
  const bg = prefix.color || '#6366f1';
  return (
    <span className="chip text-[11px] font-semibold text-white" style={{ backgroundColor: bg }}>
      {prefix.label}
    </span>
  );
}

const THREAD_TYPE_META: Record<ThreadType, { icon: React.ReactNode; label: string; color: string }> = {
  DISCUSSION: { icon: null, label: '', color: '' },
  QUESTION: { icon: <HelpCircle size={10} />, label: 'Hỏi đáp', color: '#3b82f6' },
  POLL: { icon: <BarChart2 size={10} />, label: 'Thăm dò', color: '#8b5cf6' },
  ARTICLE: { icon: <BookOpen size={10} />, label: 'Bài viết', color: '#10b981' },
  SUGGESTION: { icon: <Lightbulb size={10} />, label: 'Đề xuất', color: '#f59e0b' },
};

const TYPE_OPTIONS: { value: ThreadType | ''; label: string }[] = [
  { value: '', label: 'Tất cả' },
  { value: 'QUESTION', label: 'Hỏi đáp' },
  { value: 'POLL', label: 'Thăm dò' },
  { value: 'ARTICLE', label: 'Bài viết' },
  { value: 'SUGGESTION', label: 'Đề xuất' },
];

const POST_PER_PAGE = 20;

export function ThreadList({ categoryId, hideHeader }: { categoryId?: string; hideHeader?: boolean } = {}) {
  const { user } = useAuth();
  const [sort, setSort] = useState<SortBy>('lastPost');
  const [unanswered, setUnanswered] = useState(false);
  const [prefixId, setPrefixId] = useState('');
  const [threadType, setThreadType] = useState<ThreadType | ''>('');
  const [page, setPage] = useState(1);
  const [prefixes, setPrefixes] = useState<ThreadPrefix[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Fetch category prefixes dynamically
  useEffect(() => {
    if (!categoryId) { setPrefixes([]); return; }
    api.get<ThreadPrefix[]>(`/forum/categories/${categoryId}/prefixes`)
      .then((p) => setPrefixes(p || []))
      .catch(() => setPrefixes([]));
  }, [categoryId]);

  const params = new URLSearchParams({ limit: String(POST_PER_PAGE), sortBy: sort, page: String(page) });
  if (categoryId) params.set('categoryId', categoryId);
  if (unanswered) params.set('unanswered', '1');
  if (prefixId) params.set('prefixId', prefixId);
  if (threadType) params.set('type', threadType);

  const { data, error, isLoading } = useSWR<Paginated<Thread>>(`/forum/threads?${params}`, fetcher);
  const totalPages = data?.meta?.totalPages ?? 1;

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
          <div className="flex items-center gap-2">
            {user && (
              <button
                onClick={async () => { await api.post('/forum/read-progress/mark-all', {}); setUnreadCounts({}); }}
                className="rounded-lg px-2.5 py-1 text-xs text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
              >
                Đánh dấu đã đọc
              </button>
            )}
            <Link href="/threads/new" className="btn-primary !py-1.5 !px-3 text-xs">+ Đăng bài</Link>
          </div>
        </div>
      )}

      {/* Sort / Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-200/70 px-4 py-2 dark:border-ink-800">
        <div className="flex flex-wrap items-center gap-1">
          {SORT_OPTIONS.map((o) => (
            <button key={o.value} onClick={() => { setSort(o.value); setPage(1); }}
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${sort === o.value ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'}`}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {/* Type filter */}
          {TYPE_OPTIONS.filter((o) => o.value !== '').map((o) => (
            <button key={o.value} onClick={() => { setThreadType(threadType === o.value ? '' : o.value as ThreadType); setPage(1); }}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition flex items-center gap-1 ${threadType === o.value ? 'bg-ink-700 text-white dark:bg-ink-200 dark:text-ink-900' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'}`}>
              {o.label}
            </button>
          ))}
          {/* Prefix filter */}
          {prefixes.map((p) => (
            <button key={p.id} onClick={() => { setPrefixId(prefixId === p.id ? '' : p.id); setPage(1); }}
              className={`chip text-[11px] font-semibold text-white transition ${prefixId === p.id ? 'ring-2 ring-offset-1 ring-white/60' : 'opacity-70 hover:opacity-100'}`}
              style={{ backgroundColor: p.color || '#6366f1' }}>
              {p.label}
            </button>
          ))}
          <button onClick={() => { setUnanswered((v) => !v); setPage(1); }}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${unanswered ? 'bg-amber-500 text-white' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800'}`}>
            Chưa trả lời
          </button>
        </div>
      </div>

      {isLoading && <div className="p-8 text-center text-ink-500">Đang tải…</div>}
      {error && <div className="p-8 text-center text-red-500">Không tải được dữ liệu.</div>}
      {data && data.data.length === 0 && (
        <div className="p-10 text-center text-ink-500">
          {unanswered ? 'Không có bài viết nào chưa được trả lời.' : 'Chưa có bài viết nào.'}
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
                  {t.bestAnswerId && (
                    <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <CheckCircle2 size={9} /> Đã giải
                    </span>
                  )}
                  {t.isPinned && <Pin size={14} className="text-amber-500" />}
                  {t.isLocked && <Lock size={14} className="text-ink-400" />}
                  {t.threadType && t.threadType !== 'DISCUSSION' && (() => {
                    const m = THREAD_TYPE_META[t.threadType!];
                    return m.label ? (
                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: m.color }}>
                        {m.icon}{m.label}
                      </span>
                    ) : null;
                  })()}
                  {t.prefixRef && <PrefixChip prefix={t.prefixRef} />}
                  <Link href={`/thread?slug=${t.slug}`} className={`truncate font-semibold hover:text-brand-600 dark:text-ink-100 ${hasUnread ? 'text-ink-900 dark:text-white' : 'text-ink-800'}`}>
                    {t.title}
                  </Link>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-500">
                  <span>{t.author?.displayName || t.author?.username || 'Ẩn danh'} · {timeAgo(t.createdAt)}</span>
                  {t.category && <span>trong <span className="text-brand-600">{t.category.name}</span></span>}
                  {t.replyCount >= POST_PER_PAGE && (() => {
                    const pages = Math.ceil((t.replyCount + 1) / POST_PER_PAGE);
                    const shown = pages > 5 ? [1, 2, 3, null, pages] : Array.from({ length: pages }, (_, i) => i + 1);
                    return (
                      <span className="flex items-center gap-0.5 text-[10px]">
                        {shown.map((pg, i) => pg === null
                          ? <span key={`sep-${i}`} className="text-ink-400">…</span>
                          : <Link key={pg} href={`/thread?slug=${t.slug}&page=${pg}`} onClick={(e) => e.stopPropagation()}
                              className="rounded px-1 py-0.5 font-medium text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800"
                            >{pg}</Link>
                        )}
                      </span>
                    );
                  })()}
                </div>
                {t.tags && t.tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.tags.slice(0, 4).map((tt) => (
                      <Link key={tt.tag.id} href={`/tag?slug=${tt.tag.slug}`} onClick={(e) => e.stopPropagation()}
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: tt.tag.color ? tt.tag.color + '22' : undefined, color: tt.tag.color || undefined }}>
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
                  {t.replyCount > 0 && (() => {
                    const lastPage = Math.ceil((t.replyCount + 1) / POST_PER_PAGE);
                    return (
                      <Link href={`/thread?slug=${t.slug}&page=${lastPage}`} onClick={(e) => e.stopPropagation()}
                        title="Đến bài mới nhất" className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-brand-600 dark:hover:bg-ink-800">
                        <ArrowRight size={13} />
                      </Link>
                    );
                  })()}
                </div>
                {t.lastPostAt && t.replyCount > 0 && (
                  <span className="text-[11px] text-ink-400">{timeAgo(t.lastPostAt)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-ink-200/70 px-4 py-3 dark:border-ink-800">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800">
            ← Trước
          </button>
          <span className="text-xs text-ink-500">Trang {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || isLoading}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800">
            Sau →
          </button>
        </div>
      )}
    </section>
  );
}
