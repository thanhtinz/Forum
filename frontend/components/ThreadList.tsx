'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import useSWR from 'swr';
import { format, isToday, isYesterday } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Pin, Lock, HelpCircle, BarChart2, BookOpen, Lightbulb, CheckCircle2, SlidersHorizontal, MessageSquare, ChevronDown, Eye, Clock } from 'lucide-react';
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

function fmtCount(n?: number) {
  const v = n ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return String(v);
}

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
      setPanelPos({
        top: rect.bottom + window.scrollY + 2,
        right: window.innerWidth - rect.right,
      });
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
    <section className="space-y-4">
      {/* Thanh tiêu đề + bộ lọc kiểu zibll: nhẹ nhàng, không phải khối card nặng */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!hideHeader && (
            <>
              <span className="h-5 w-1.5 rounded-full bg-brand-500" />
              <h2 className="text-lg font-bold">Bài viết mới nhất</h2>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {user && !hideHeader && (
            <button
              onClick={async () => { await api.post('/forum/read-progress/mark-all', {}); setUnreadCounts({}); }}
              className="rounded-lg px-2.5 py-1.5 text-xs text-ink-500 hover:bg-ink-200/60 dark:hover:bg-ink-800"
            >
              Đánh dấu đã đọc
            </button>
          )}
          <button
            ref={filterBtnRef}
            onClick={openFilter}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${isFiltered ? 'border-brand-400 bg-brand-50 text-brand-600 dark:bg-brand-950/40' : 'border-ink-200 text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-300 dark:hover:bg-ink-800'}`}
          >
            <SlidersHorizontal size={14} />
            Bộ lọc
            <ChevronDown size={14} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter panel — rendered as fixed portal to escape overflow:hidden */}
      {filterOpen && panelPos && typeof window !== 'undefined' && createPortal(
        <div
          ref={filterPanelRef}
          className="overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl dark:border-ink-700 dark:bg-ink-900"
          style={{ position: 'absolute', top: panelPos.top, right: panelPos.right, width: 320, zIndex: 9999 }}
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

      {isLoading && <div className="card p-8 text-center text-ink-500">Đang tải…</div>}
      {error && <div className="card p-8 text-center text-red-500">Không tải được dữ liệu.</div>}
      {data && data.data.length === 0 && (
        <div className="card p-10 text-center text-ink-500">Chưa có bài viết nào.</div>
      )}

      {/* Lưới thẻ magazine kiểu zibll */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {data?.data.map((t) => {
          const unread    = unreadCounts[t.id];
          const hasUnread = typeof unread === 'number' && unread > 0;
          const typeIcon  = t.threadType ? THREAD_TYPE_ICONS[t.threadType] : null;
          const coverColor = t.category?.color || '#2c7bfe';

          return (
            <article key={t.id} className="post-card group">
              {/* Ảnh bìa 16:9 (fallback gradient theo màu danh mục) */}
              <Link href={`/thread?slug=${t.slug}`} className="relative block aspect-[16/9] overflow-hidden">
                {t.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.coverImage} alt="" loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${coverColor}, ${coverColor}99)` }}>
                    <span className="px-4 text-center text-lg font-bold leading-snug text-white/95 line-clamp-3">{t.title}</span>
                  </div>
                )}
                {/* Chip danh mục + trạng thái đè lên ảnh */}
                <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1">
                  {t.category && !categoryId && (
                    <span className="rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                      {t.category.name}
                    </span>
                  )}
                  {t.prefixRef && (
                    <span className="rounded-md px-2 py-0.5 text-[11px] font-bold text-white"
                      style={{ backgroundColor: t.prefixRef.color || '#2c7bfe' }}>
                      {t.prefixRef.label}
                    </span>
                  )}
                </div>
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  {t.isPinned && <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-500 text-white"><Pin size={13} /></span>}
                  {t.isLocked && <span className="grid h-6 w-6 place-items-center rounded-md bg-ink-700/80 text-white"><Lock size={13} /></span>}
                  {hasUnread && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">{unread} mới</span>}
                </div>
              </Link>

              {/* Nội dung thẻ */}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center gap-1.5">
                  {typeIcon}
                  {t.bestAnswerId && <CheckCircle2 size={13} className="text-emerald-500" />}
                  <Link
                    href={`/thread?slug=${t.slug}`}
                    className={`line-clamp-2 flex-1 font-bold leading-snug transition-colors hover:text-brand-600 ${hasUnread ? 'text-ink-900 dark:text-white' : 'text-ink-800 dark:text-ink-100'}`}
                  >
                    {t.title}
                  </Link>
                </div>

                {t.excerpt && (
                  <p className="line-clamp-2 text-sm text-ink-500 dark:text-ink-400">{t.excerpt}</p>
                )}

                {t.tags && t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.tags.slice(0, 3).map((tt) => (
                      <Link
                        key={tt.tag.id}
                        href={`/tag?slug=${tt.tag.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: tt.tag.color ? tt.tag.color + '22' : '#2c7bfe22', color: tt.tag.color || '#2c7bfe' }}
                      >
                        #{tt.tag.name}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Chân thẻ: tác giả + số liệu */}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink-100 pt-2.5 dark:border-ink-800">
                  <Link href={`/profile?u=${t.author?.username}`} className="flex min-w-0 items-center gap-1.5">
                    <Avatar user={t.author ?? { username: '?' }} size={24} />
                    <span className="truncate text-xs font-medium text-ink-600 hover:text-brand-600 dark:text-ink-300">
                      {t.author?.displayName || t.author?.username}
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2.5 text-[11px] text-ink-400">
                    <span className="flex items-center gap-0.5" title="Lượt xem"><Eye size={12} />{fmtCount(t.viewCount)}</span>
                    <span className="flex items-center gap-0.5" title="Trả lời"><MessageSquare size={12} />{fmtCount(t.replyCount)}</span>
                    {t.lastPostAt && <span className="hidden items-center gap-0.5 sm:flex" title="Cập nhật"><Clock size={12} />{formatLastPost(t.lastPostAt)}</span>}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="card flex items-center justify-between px-4 py-3">
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
