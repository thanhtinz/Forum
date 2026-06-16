'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ThumbsUp, MessageCircle, Eye, Lock, Pin, Bell, BellRing, BarChart3, CheckCircle2, Award, Bookmark, BookmarkCheck, SmilePlus, Clock, FolderInput, Merge } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import type { Thread, Post, Paginated } from '@/lib/types';

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

// Ước tính thời gian đọc (200 từ/phút) từ HTML các bài viết
function readingTime(posts: { content: string }[]): number {
  const text = posts.map((p) => p.content.replace(/<[^>]+>/g, ' ')).join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

interface PollOption { id: string; text: string; voteCount: number; percent: number }
interface Poll {
  id: string; question: string; multiple: boolean; maxOptions: number; totalVotes: number;
  isClosed: boolean; hasVoted: boolean; myVotes: string[]; options: PollOption[];
}

function PollCard({ threadId }: { threadId: string }) {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const p = await api.get<Poll | null>(`/forum/threads/${threadId}/poll`).catch(() => null);
    setPoll(p); if (p) setPicked(p.myVotes);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [threadId]);
  if (!poll) return null;

  const showResults = poll.hasVoted || poll.isClosed;
  function toggle(id: string) {
    if (poll!.multiple) setPicked((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-poll!.maxOptions));
    else setPicked([id]);
  }
  async function vote() {
    if (!picked.length) return;
    setBusy(true);
    try { const p = await api.post<Poll>(`/forum/polls/${poll!.id}/vote`, { optionIds: picked }); setPoll(p); setPicked(p.myVotes); } catch {}
    setBusy(false);
  }

  return (
    <div className="card p-5">
      <h3 className="flex items-center gap-2 font-semibold"><BarChart3 size={18} className="text-brand-600" /> {poll.question}</h3>
      <p className="mt-0.5 text-xs text-ink-500">{poll.totalVotes} lượt bình chọn{poll.multiple ? ` · chọn tối đa ${poll.maxOptions}` : ''}{poll.isClosed ? ' · đã đóng' : ''}</p>
      <div className="mt-3 space-y-2">
        {poll.options.map((o) => {
          const mine = picked.includes(o.id);
          return (
            <button key={o.id} disabled={poll.isClosed || !user}
              onClick={() => toggle(o.id)}
              className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm ${mine ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-ink-200 dark:border-ink-800'}`}>
              {showResults && <span className="absolute inset-0 -z-0 bg-brand-100/60 dark:bg-brand-900/30" style={{ width: `${o.percent}%` }} />}
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">{mine && <CheckCircle2 size={14} className="text-brand-600" />}{o.text}</span>
                {showResults && <span className="text-xs font-medium text-ink-500">{o.percent}% ({o.voteCount})</span>}
              </span>
            </button>
          );
        })}
      </div>
      {!poll.isClosed && user && (
        <button onClick={vote} disabled={busy || !picked.length} className="btn-primary mt-3 !py-1.5 text-sm">
          {poll.hasVoted ? 'Đổi bình chọn' : 'Bình chọn'}
        </button>
      )}
    </div>
  );
}

function ThreadView() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reply, setReply] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const isMod = user && (user.role === 'ADMIN' || user.role === 'MODERATOR');
  const canManage = thread && user && ((thread as any).author?.id === user.id || isMod);
  const bestAnswerId = thread ? (thread as any).bestAnswerId : null;

  async function load() {
    try {
      const t = await api.get<Thread>(`/forum/threads/${slug}`);
      setThread(t);
      const p = await api.get<Paginated<Post>>(`/forum/threads/${t.id}/posts?limit=50`);
      setPosts(p.data);
      if (user) {
        api.get<{ subscribed: boolean }>(`/forum/threads/${t.id}/subscription`).then((s) => setSubscribed(s.subscribed)).catch(() => {});
        api.get<{ bookmarked: boolean }>(`/forum/threads/${t.id}/bookmark`).then((b) => setBookmarked(b.bookmarked)).catch(() => {});
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (slug) load(); /* eslint-disable-next-line */ }, [slug, user]);

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

  async function react(postId: string, emoji: string) {
    try { await api.post(`/forum/posts/${postId}/react`, { emoji }); load(); } catch {}
  }
  async function moveThread() {
    if (!thread) return;
    const categoryId = prompt('Nhập ID chuyên mục đích:');
    if (!categoryId) return;
    try { await api.post(`/forum/threads/${thread.id}/move`, { categoryId }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function mergeThread() {
    if (!thread) return;
    const targetId = prompt('Nhập ID chủ đề đích để gộp VÀO (chủ đề này sẽ bị xoá):');
    if (!targetId) return;
    try { const r = await api.post<{ mergedInto: string }>(`/forum/threads/${thread.id}/merge`, { targetId }); alert('Đã gộp.'); window.location.href = `/thread?slug=`; } catch (e: any) { setErr(e.message); }
  }
  async function toggleSub() {
    if (!thread) return;
    try { const r = await api.post<{ subscribed: boolean }>(`/forum/threads/${thread.id}/subscribe`, {}); setSubscribed(r.subscribed); } catch {}
  }
  async function toggleBookmark() {
    if (!thread) return;
    try { const r = await api.post<{ bookmarked: boolean }>(`/forum/threads/${thread.id}/bookmark`, {}); setBookmarked(r.bookmarked); } catch {}
  }
  async function markBest(postId: string) {
    if (!thread) return;
    try { await api.post(`/forum/threads/${thread.id}/best-answer`, { postId }); load(); } catch {}
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (err && !thread) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!thread) return null;

  // Đưa best answer lên đầu (sau bài gốc) nếu có
  const ordered = bestAnswerId ? [...posts].sort((a, b) => {
    if ((a as any).isFirstPost) return -1; if ((b as any).isFirstPost) return 1;
    if (a.id === bestAnswerId) return -1; if (b.id === bestAnswerId) return 1; return 0;
  }) : posts;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm text-ink-500">
          {thread.isPinned && <Pin size={14} className="text-amber-500" />}
          {thread.isLocked && <Lock size={14} />}
          {thread.category && <span className="text-brand-600">{thread.category.name}</span>}
        </div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-xl font-bold sm:text-2xl">{thread.title}</h1>
          {user && (
            <div className="flex shrink-0 gap-2">
              <button onClick={toggleBookmark} title="Lưu chủ đề"
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${bookmarked ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
                {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} {bookmarked ? 'Đã lưu' : 'Lưu'}
              </button>
              <button onClick={toggleSub} title="Theo dõi chủ đề"
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${subscribed ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
                {subscribed ? <BellRing size={14} /> : <Bell size={14} />} {subscribed ? 'Đang theo dõi' : 'Theo dõi'}
              </button>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
          <span className="flex items-center gap-1"><MessageCircle size={14} /> {thread.replyCount} trả lời</span>
          <span className="flex items-center gap-1"><Eye size={14} /> {thread.viewCount} lượt xem</span>
          <span className="flex items-center gap-1"><ThumbsUp size={14} /> {thread.likeCount}</span>
          {posts.length > 0 && <span className="flex items-center gap-1"><Clock size={14} /> ~{readingTime(posts)} phút đọc</span>}
        </div>
        {isMod && (
          <div className="mt-3 flex gap-2 border-t border-ink-200/70 pt-3 dark:border-ink-800">
            <button onClick={moveThread} className="flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-1.5 text-xs hover:bg-ink-200 dark:bg-ink-800"><FolderInput size={13} /> Chuyển mục</button>
            <button onClick={mergeThread} className="flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-1.5 text-xs hover:bg-ink-200 dark:bg-ink-800"><Merge size={13} /> Gộp chủ đề</button>
          </div>
        )}
      </div>

      <PollCard threadId={thread.id} />

      <div className="space-y-3">
        {ordered.map((p) => {
          const isFirst = (p as any).isFirstPost;
          const isBest = p.id === bestAnswerId;
          return (
            <article key={p.id} id={`post-${p.id}`} className={`card flex overflow-hidden ${isBest ? 'ring-2 ring-emerald-400' : ''}`}>
              <div className="w-32 shrink-0 border-r border-ink-200/70 bg-ink-50 p-4 text-center dark:border-ink-800 dark:bg-ink-900/50">
                {p.author && <div className="mx-auto"><Avatar user={p.author} size={56} /></div>}
                <div className="mt-2 truncate text-sm font-semibold">{p.author?.displayName || p.author?.username}</div>
                {isFirst && <span className="chip mt-1 bg-brand-100 text-brand-700">Chủ thớt</span>}
              </div>
              <div className="min-w-0 flex-1 p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-ink-500">
                  <span>{(() => { try { return formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}</span>
                  {isBest && <span className="flex items-center gap-1 font-medium text-emerald-600"><Award size={14} /> Câu trả lời hay nhất</span>}
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: p.content }} />
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {/* Các reaction đã có, gom theo emoji */}
                  {(() => {
                    const groups: Record<string, string[]> = {};
                    (p.reactions || []).forEach((r) => { (groups[r.emoji] ||= []).push(r.userId); });
                    return Object.entries(groups).map(([emoji, uids]) => {
                      const mine = !!user && uids.includes(user.id);
                      const label = emoji === 'like' ? '👍' : emoji;
                      return (
                        <button key={emoji} onClick={() => user && react(p.id, emoji)}
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 ${mine ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30' : 'border-ink-200 dark:border-ink-800'}`}>
                          <span>{label}</span> <span className="text-ink-500">{uids.length}</span>
                        </button>
                      );
                    });
                  })()}
                  {/* Bộ chọn thêm reaction */}
                  {user && (
                    <div className="group relative">
                      <button className="flex items-center gap-1 rounded-full border border-dashed border-ink-300 px-2 py-0.5 text-ink-500 hover:text-brand-600 dark:border-ink-700"><SmilePlus size={14} /></button>
                      <div className="absolute left-0 top-full z-10 mt-1 hidden gap-1 rounded-lg border border-ink-200 bg-white p-1 shadow-card group-hover:flex dark:border-ink-800 dark:bg-ink-900">
                        {REACTIONS.map((e) => (
                          <button key={e} onClick={() => react(p.id, e)} className="rounded p-1 text-base hover:bg-ink-100 dark:hover:bg-ink-800">{e}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {canManage && !isFirst && (
                    <button onClick={() => markBest(p.id)} className={`ml-auto flex items-center gap-1 ${isBest ? 'text-emerald-600' : 'text-ink-500 hover:text-emerald-600'}`}>
                      <Award size={14} /> {isBest ? 'Bỏ chọn' : 'Chọn là câu trả lời hay nhất'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="card p-4">
        {user ? (
          thread.isLocked ? (
            <p className="text-center text-sm text-ink-500">Chủ đề đã bị khoá.</p>
          ) : (
            <form onSubmit={submitReply} className="space-y-2">
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4}
                placeholder="Viết trả lời (hỗ trợ Markdown · @ để nhắc thành viên)…" className="input resize-y" />
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
