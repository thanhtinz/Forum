'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import useSWR from 'swr';
import { format, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Pin, Lock, HelpCircle, BarChart2, BookOpen, Lightbulb, CheckCircle2, SlidersHorizontal, MessageSquare, ChevronDown } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { Avatar } from './Header';
import { useAuth } from './AuthProvider';
import type { Paginated, Thread, ThreadPrefix, ThreadType } from '@/lib/types';

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

function sinceDate(v: string): string | undefined {
  if (v === 'all') return undefined;
  const now = new Date();
  if (v === 'today')  { now.setHours(0,0,0,0); return now.toISOString(); }
  if (v === 'week')   { now.setDate(now.getDate() - now.getDay()); now.setHours(0,0,0,0); return now.toISOString(); }
  if (v === 'month')  { return new Date(now.getFullYear(), now.getMonth(), 1).toISOString(); }
  if (v === 'year')   { return new Date(now.getFullYear(), 0, 1).toISOString(); }
}

const POST_PER_PAGE = 20;

const SINCE_OPTIONS = [
  { value: 'all',   label: 'Tất cả thời gian' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week',  label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'year',  label: 'Năm nay' },
];

const SORT_FIELDS = [
  { value: 'lastPost',    label: 'Bài viết cuối' },
  { value: 'createdAt',  label: 'Mới nhất' },
  { value: 'replyCount', label: 'Nhiều trả lời' },
  { value: 'viewCount',  label: 'Nhiều lượt xem' },
];

const SORT_DIRS = [
  { value: 'desc', label: 'Giảm dần' },
  { value: 'asc',  label: 'Tăng dần' },
];

interface FilterState {
  prefixId: string;
  startBy: string;
  since: string;
  sortBy: string;
  sortDir: string;
}

const DEFAULT_FILTER: FilterState = {
  prefixId: '',
  startBy: '',
  since: 'all',
  sortBy: 'lastPost',
  sortDir: 'desc',
};

export function ThreadList({
  categoryId,
  hideHeader,
  markReadKey,
}: {
  categoryId?: string;
  hideHeader?: boolean;
  markReadKey?: number;
} = {}) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [form, setForm] = useState<FilterState>(DEFAULT_FILTER);
  const [applied, setApplied] = useState<FilterState>(DEFAULT_FILTER);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const { data: prefixes } = useSWR<ThreadPrefix[]>(
    categoryId ? `/forum/categories/${categoryId}/prefixes` : null,
    fetcher,
  );

  const params = new URLSearchParams({ limit: String(POST_PER_PAGE), page: String(page), sortBy: applied.sortBy, sortDir: applied.sortDir });
  if (categoryId) params.set('categoryId', categoryId);
  if (applied.prefixId) params.set('prefixId', applied.prefixId);
  if (applied.startBy.trim()) params.set('author', applied.startBy.trim());
  const sd = sinceDate(applied.since);
  if (sd) params.set('since', sd);

  const { data, error, isLoading } = useSWR<Paginated<Thread>>(`/forum/threads?${params}`, fetcher);
  const totalPages = data?.meta?.totalPages ?? 1;

  useEffect(() => {
    if (!user || !data?.data?.length) return;
    api.post<Record<string, number>>('/forum/read-progress/bulk', { threadIds: data.data.map((t) => t.id) })
      .then(setUnreadCounts).catch(() => {});
  }, [user, data]);

  // Clear unread when parent signals mark-all-read
  useEffect(() => {
    if (markReadKey !== undefined && markReadKey > 0) setUnreadCounts({});
  }, [markReadKey]);

  // Close filter on outside click
  useEffect(() => {
    if (!filterOpen) return;
    function handleClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!filterBtnRef.current?.contains(t) && !filterPanelRef.current?.contains(t)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  function openFilter() {
    if (!filterOpen && filterBtnRef.current) {
      const rect = filterBtnRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 2, right: window.innerWidth - rect.right });
    }
    setFilterOpen((v) => !v);
  }

  function applyFilter() {
    setApplied({ ...form });
    setPage(1);
    setFilterOpen(false);
  }

  function resetFilter() {
    setForm(DEFAULT_FILTER);
    setApplied(DEFAULT_FILTER);
    setPage(1);
    setFilterOpen(false);
  }

  const isFiltered = applied.prefixId || applied.startBy || applied.since !== 'all' || applied.sortBy !== 'lastPost' || applied.sortDir !== 'desc';

  return (
    <section className="card overflow-hidden">
      {/* Card header — hidden when embedded in category page */}
      {!hideHeader && (
        <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
          <h2 className="font-semibold">Bài viết mới nhất</h2>
          {user && (
            <button
              onClick={async () => { await api.post('/forum/read-progress/mark-all', {}); setUnreadCounts({}); }}
              className="rounded-lg px-2.5 py-1.5 text-xs text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              Đánh dấu đã đọc
            </button>
          )}
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-end border-b border-ink-200/70 bg-[#2d4a6a] px-4 py-2 dark:border-ink-800 dark:bg-slate-800">
        <button
          ref={filterBtnRef}
          onClick={openFilter}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium hover:text-white ${isFiltered ? 'text-amber-300' : 'text-white/90'}`}
        >
          <SlidersHorizontal size={14} />
          Bộ lọc
          <ChevronDown size={14} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filter panel — rendered as fixed portal to escape overflow:hidden */}
      {filterOpen && panelPos && typeof window !== 'undefined' && createPortal(
        <div
          ref={filterPanelRef}
          className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl dark:border-ink-700 dark:bg-ink-900"
          style={{ position: 'fixed', top: panelPos.top, right: panelPos.right, width: 320, zIndex: 9999 }}
        >
          <div className="border-b border-ink-100 bg-ink-50 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-800">
            <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">Chỉ hiển thị:</span>
          </div>
          <div className="space-y-3 p-4">
            {/* Tiền tố */}
            {categoryId && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-500">Tiền tố:</label>
                <select
                  value={form.prefixId}
                  onChange={(e) => setForm((f) => ({ ...f, prefixId: e.target.value }))}
                  className="input w-full text-sm"
                >
                  <option value="">(Tất cả)</option>
                  {prefixes?.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Bắt đầu bởi */}
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Bắt đầu bởi:</label>
              <input
                type="text"
                placeholder="Tên thành viên…"
                value={form.startBy}
                onChange={(e) => setForm((f) => ({ ...f, startBy: e.target.value }))}
                className="input w-full text-sm"
              />
            </div>

            {/* Cập nhật mới nhất */}
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Cập nhật mới nhất:</label>
              <select
                value={form.since}
                onChange={(e) => setForm((f) => ({ ...f, since: e.target.value }))}
                className="input w-full text-sm"
              >
                {SINCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Phân loại */}
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500">Phân loại:</label>
              <div className="flex gap-2">
                <select
                  value={form.sortBy}
                  onChange={(e) => setForm((f) => ({ ...f, sortBy: e.target.value }))}
                  className="input flex-1 text-sm"
                >
                  {SORT_FIELDS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select
                  value={form.sortDir}
                  onChange={(e) => setForm((f) => ({ ...f, sortDir: e.target.value }))}
                  className="input w-28 text-sm"
                >
                  {SORT_DIRS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-1">
              <button onClick={resetFilter} className="text-xs text-ink-400 hover:text-ink-600 dark:hover:text-ink-300">
                Đặt lại
              </button>
              <button onClick={applyFilter} className="btn-primary !py-1.5 !px-4 text-sm">
                LỌC
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

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

              {/* Reply count — right side on sm+ */}
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
