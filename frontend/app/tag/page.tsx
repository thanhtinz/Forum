'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Hash, Users, Check, Plus, MessageCircle, Eye, ThumbsUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import type { Thread, Paginated } from '@/lib/types';

interface TagDetail {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  usageCount: number;
  followerCount: number;
  isFollowing: boolean;
}

function TagView() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const [tag, setTag] = useState<TagDetail | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    try {
      const t = await api.get<TagDetail>(`/forum/tags/${encodeURIComponent(slug)}`);
      setTag(t);
      const p = await api.get<Paginated<Thread>>(`/forum/tags/${t.id}/threads?limit=30`);
      setThreads(p.data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (slug) load(); /* eslint-disable-next-line */ }, [slug, user]);

  async function toggleFollow() {
    if (!tag || !user) return;
    setBusy(true);
    try {
      const r = await api.post<{ following: boolean }>(`/forum/tags/${tag.id}/follow`, {});
      setTag({ ...tag, isFollowing: r.following, followerCount: tag.followerCount + (r.following ? 1 : -1) });
    } catch {} finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (err && !tag) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!tag) return null;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-1.5 text-xl font-bold sm:text-2xl">
              <Hash size={22} className="text-brand-500" /> {tag.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
              <span>{tag.usageCount} bài viết</span>
              <span className="flex items-center gap-1"><Users size={13} /> {tag.followerCount} người theo dõi</span>
            </div>
          </div>
          {user && (
            <button
              onClick={toggleFollow}
              disabled={busy}
              className={`flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                tag.isFollowing ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'
              }`}
            >
              {tag.isFollowing ? <><Check size={14} /> Đang theo dõi</> : <><Plus size={14} /> Theo dõi</>}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {threads.length === 0 ? (
          <div className="card p-8 text-center text-ink-500">Chưa có bài viết nào với thẻ này.</div>
        ) : (
          threads.map((t) => (
            <a key={t.id} href={`/thread?slug=${encodeURIComponent(t.slug)}`} className="card block p-4 hover:bg-ink-50/50 dark:hover:bg-ink-900/40">
              <div className="flex items-center gap-2 text-xs text-ink-500">
                {t.category && <span className="text-brand-600">{t.category.name}</span>}
                {t.author && <span>· {t.author.displayName || t.author.username}</span>}
              </div>
              <h3 className="mt-1 font-semibold">{t.title}</h3>
              <div className="mt-1 flex flex-wrap gap-4 text-xs text-ink-500">
                <span className="flex items-center gap-1"><MessageCircle size={13} /> {t.replyCount}</span>
                <span className="flex items-center gap-1"><Eye size={13} /> {t.viewCount}</span>
                <span className="flex items-center gap-1"><ThumbsUp size={13} /> {t.likeCount}</span>
                {t.lastPostAt && (
                  <span>{(() => { try { return formatDistanceToNow(new Date(t.lastPostAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}</span>
                )}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

export default function TagPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <TagView />
    </Suspense>
  );
}
