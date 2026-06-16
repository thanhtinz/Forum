'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ThumbsUp, MessageCircle, Eye, Lock, Pin } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import type { Thread, Post, Paginated } from '@/lib/types';

function ThreadView() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reply, setReply] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const t = await api.get<Thread>(`/forum/threads/${slug}`);
      setThread(t);
      const p = await api.get<Paginated<Post>>(`/forum/threads/${t.id}/posts?limit=50`);
      setPosts(p.data);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (slug) load(); /* eslint-disable-next-line */ }, [slug]);

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!thread || !reply.trim()) return;
    try {
      await api.post('/forum/posts', { threadId: thread.id, content: reply });
      setReply('');
      const p = await api.get<Paginated<Post>>(`/forum/threads/${thread.id}/posts?limit=50`);
      setPosts(p.data);
    } catch (e: any) { setErr(e.message); }
  }

  async function like(postId: string) {
    try { await api.post(`/forum/posts/${postId}/react`, { emoji: 'like' }); load(); } catch {}
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (err && !thread) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!thread) return null;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm text-ink-500">
          {thread.isPinned && <Pin size={14} className="text-amber-500" />}
          {thread.isLocked && <Lock size={14} />}
          {thread.category && <span className="text-brand-600">{thread.category.name}</span>}
        </div>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">{thread.title}</h1>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
          <span className="flex items-center gap-1"><MessageCircle size={14} /> {thread.replyCount} trả lời</span>
          <span className="flex items-center gap-1"><Eye size={14} /> {thread.viewCount} lượt xem</span>
          <span className="flex items-center gap-1"><ThumbsUp size={14} /> {thread.likeCount}</span>
        </div>
      </div>

      <div className="space-y-3">
        {posts.map((p, i) => (
          <article key={p.id} className="card flex overflow-hidden">
            <div className="w-32 shrink-0 border-r border-ink-200/70 bg-ink-50 p-4 text-center dark:border-ink-800 dark:bg-ink-900/50">
              {p.author && <div className="mx-auto"><Avatar user={p.author} size={56} /></div>}
              <div className="mt-2 truncate text-sm font-semibold">{p.author?.displayName || p.author?.username}</div>
              {i === 0 && <span className="chip mt-1 bg-brand-100 text-brand-700">Chủ thớt</span>}
            </div>
            <div className="min-w-0 flex-1 p-4">
              <div className="mb-2 text-xs text-ink-500">
                {(() => { try { return formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: p.content }} />
              <div className="mt-3 flex items-center gap-3 text-xs">
                <button onClick={() => like(p.id)} className="flex items-center gap-1 text-ink-500 hover:text-brand-600">
                  <ThumbsUp size={14} /> Thích ({p.likeCount})
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="card p-4">
        {user ? (
          thread.isLocked ? (
            <p className="text-center text-sm text-ink-500">Chủ đề đã bị khoá.</p>
          ) : (
            <form onSubmit={submitReply} className="space-y-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4}
                placeholder="Viết trả lời (hỗ trợ Markdown)…" className="input resize-y" />
              {err && <p className="text-sm text-red-500">{err}</p>}
              <div className="flex justify-end">
                <button className="btn-primary" type="submit">Gửi trả lời</button>
              </div>
            </form>
          )
        ) : (
          <p className="text-center text-sm text-ink-500">
            Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a> để trả lời.
          </p>
        )}
      </div>
    </div>
  );
}

export default function ThreadPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <ThreadView />
    </Suspense>
  );
}
