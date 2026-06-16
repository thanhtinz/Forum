'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Pin, Lock, MessageCircle, Eye, ThumbsUp } from 'lucide-react';
import { fetcher } from '@/lib/api';
import { Avatar } from './Header';
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

function timeAgo(d?: string) {
  if (!d) return '';
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: vi }); } catch { return ''; }
}

export function ThreadList() {
  const { data, error, isLoading } = useSWR<Paginated<Thread>>('/forum/threads?limit=20', fetcher);

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
        <h2 className="font-semibold">Bài viết mới nhất</h2>
        <Link href="/threads/new" className="btn-primary !py-1.5 !px-3 text-xs">+ Đăng bài</Link>
      </div>

      {isLoading && <div className="p-8 text-center text-ink-500">Đang tải…</div>}
      {error && <div className="p-8 text-center text-red-500">Không tải được dữ liệu (kiểm tra API).</div>}
      {data && data.data.length === 0 && (
        <div className="p-10 text-center text-ink-500">Chưa có bài viết nào. Hãy là người đầu tiên!</div>
      )}

      <ul className="divide-y divide-ink-200/70 dark:divide-ink-800">
        {data?.data.map((t) => (
          <li key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
            {t.author && <Avatar user={t.author} size={40} />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {t.isPinned && <Pin size={14} className="text-amber-500" />}
                {t.isLocked && <Lock size={14} className="text-ink-400" />}
                {t.prefix && t.prefix !== 'NONE' && (
                  <span className={`chip ${PREFIX_STYLE[t.prefix] || 'bg-ink-200 text-ink-700'}`}>{t.prefix}</span>
                )}
                <Link href={`/threads/${t.slug}`} className="truncate font-semibold text-ink-800 hover:text-brand-600 dark:text-ink-100">
                  {t.title}
                </Link>
              </div>
              <div className="mt-0.5 text-xs text-ink-500">
                {t.author?.displayName || t.author?.username || 'Ẩn danh'} · {timeAgo(t.createdAt)}
                {t.category && <> · trong <span className="text-brand-600">{t.category.name}</span></>}
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-4 text-xs text-ink-500 sm:flex">
              <span className="flex items-center gap-1"><MessageCircle size={14} /> {t.replyCount}</span>
              <span className="flex items-center gap-1"><Eye size={14} /> {t.viewCount}</span>
              <span className="flex items-center gap-1"><ThumbsUp size={14} /> {t.likeCount}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
