'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ThumbsUp, MessageCircle, Eye, Lock, Pin, Bell, BellRing, BarChart3, CheckCircle2, Award, Bookmark, BookmarkCheck, SmilePlus, Clock, FolderInput, Merge, Gem, Scissors, Quote, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import { UserBadges, roleBadgesFromUser } from '@/components/UserBadges';
import type { Thread, Post, Paginated } from '@/lib/types';
import { interceptExternalLink } from '@/lib/externalLink';
import TipTapEditor from '@/components/TipTapEditor';
import ThreadJobPanel from '@/components/ThreadJobPanel';

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
  const [replyDraft, setReplyDraft] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState('');
  const [hiddenOn, setHiddenOn] = useState(false);
  const [hidden, setHidden] = useState({ content: '', gateType: 'LIKE_REQUIRED', likeRequired: 1, commentRequired: 1, gemPrice: 10, label: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitSelected, setSplitSelected] = useState<string[]>([]);
  const [splitTitle, setSplitTitle] = useState('');
  const [splitBusy, setSplitBusy] = useState(false);
  const [modModal, setModModal] = useState<null | 'move' | 'merge'>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [moveCategoryId, setMoveCategoryId] = useState('');
  const [mergeQuery, setMergeQuery] = useState('');
  const [mergeResults, setMergeResults] = useState<Thread[]>([]);
  const [modBusy, setModBusy] = useState(false);
  const [lastReadPostId, setLastReadPostId] = useState<string | null>(null);
  const [initialLastReadPostId, setInitialLastReadPostId] = useState<string | null>(null);
  const lastSentPostIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrolledToLastRead = useRef(false);

  const [viewing, setViewing] = useState<{ total: number; users: { id: string; username: string; displayName?: string | null; avatar?: string | null }[] }>({ total: 0, users: [] });

  const isMod = user && (user.role === 'ADMIN' || user.role === 'MODERATOR');
  const canManage = thread && user && ((thread as any).author?.id === user.id || isMod);
  const bestAnswerId = thread ? (thread as any).bestAnswerId : null;

  async function load() {
    try {
      const t = await api.get<Thread>(`/forum/threads/${slug}`);
      setThread(t);
      const p = await api.get<Paginated<Post>>(`/forum/threads/${t.id}/posts?limit=50`);
      setPosts(p.data);
      api.get<{ total: number; users: any[] }>(`/community/threads/${t.id}/viewing`).then(setViewing).catch(() => {});
      if (user) {
        api.get<{ subscribed: boolean }>(`/forum/threads/${t.id}/subscription`).then((s) => setSubscribed(s.subscribed)).catch(() => {});
        api.get<{ bookmarked: boolean }>(`/forum/threads/${t.id}/bookmark`).then((b) => setBookmarked(b.bookmarked)).catch(() => {});
        api.get<{ lastReadPostId: string | null }>(`/forum/threads/${t.id}/read-progress`).then((rp) => {
          setLastReadPostId(rp.lastReadPostId);
          setInitialLastReadPostId(rp.lastReadPostId);
        }).catch(() => {});
        api.get<any[]>('/forum/drafts').then((ds) => {
          const d = (ds || []).find((x) => x.threadId === t.id);
          if (d?.content) setReplyDraft(d.content);
        }).catch(() => {});
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (slug) load(); /* eslint-disable-next-line */ }, [slug, user]);

  function quotePost(p: Post) {
    const name = p.author?.username || 'ẩn danh';
    const html = `<blockquote><p><strong>@${name}</strong> đã viết:</p>${p.content}</blockquote><p></p>`;
    setReply((prev) => (prev || '') + html);
    document.getElementById('reply-box')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function saveReplyDraft() {
    if (!thread || !reply.trim()) return;
    try { await api.post('/forum/drafts', { threadId: thread.id, content: reply }); setErr(''); alert('Đã lưu nháp trả lời'); } catch (e: any) { setErr(e.message); }
  }

  // Bấm để copy (widget .fx-copy trong nội dung bài viết)
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement)?.closest?.('.fx-copy') as HTMLElement | null;
      if (!el) return;
      const text = el.getAttribute('data-copy') || el.textContent || '';
      if (!text) return;
      navigator.clipboard?.writeText(text).then(() => { setCopyToast('Đã copy'); setTimeout(() => setCopyToast(''), 1500); }).catch(() => {});
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!thread || !reply.trim()) return;
    try {
      const r = await api.post<any>('/forum/posts', { threadId: thread.id, content: reply });
      setReply('');
      if (r?.pendingApproval) { setErr(''); alert('Trả lời của bạn đang chờ kiểm duyệt và sẽ hiển thị sau khi được duyệt.'); return; }
      // Nội dung ẩn cho bài trả lời
      if (hiddenOn && hidden.content.trim() && r?.id) {
        const g = hidden.gateType;
        const body: any = { postId: r.id, contentRaw: hidden.content, gateType: g };
        if (hidden.label.trim()) body.label = hidden.label.trim();
        if (['LIKE_REQUIRED', 'LIKE_AND_COMMENT', 'LIKE_OR_COMMENT', 'LIKE_OR_GEM'].includes(g)) body.likeRequired = Math.max(1, hidden.likeRequired);
        if (['COMMENT_REQUIRED', 'LIKE_AND_COMMENT', 'LIKE_OR_COMMENT', 'COMMENT_OR_GEM'].includes(g)) body.commentRequired = Math.max(1, hidden.commentRequired);
        if (['GEM_PURCHASE', 'LIKE_OR_GEM', 'COMMENT_OR_GEM'].includes(g)) body.gemPrice = Math.max(1, hidden.gemPrice);
        await api.post('/hidden-content/sections', body).catch(() => {});
        setHiddenOn(false); setHidden({ content: '', gateType: 'LIKE_REQUIRED', likeRequired: 1, commentRequired: 1, gemPrice: 10, label: '' });
      }
      // Xoá nháp trả lời của thread này (nếu có)
      api.get<any[]>('/forum/drafts').then((ds) => {
        const d = (ds || []).find((x) => x.threadId === thread.id);
        if (d) api.del(`/forum/drafts/${d.id}`).catch(() => {});
      }).catch(() => {});
      const p = await api.get<Paginated<Post>>(`/forum/threads/${thread.id}/posts?limit=50`);
      setPosts(p.data);
    } catch (e: any) { setErr(e.message); }
  }

  async function react(postId: string, emoji: string) {
    try { await api.post(`/forum/posts/${postId}/react`, { emoji }); load(); } catch {}
  }
  function openMove() {
    setModModal('move');
    if (!categories.length) api.get<{ id: string; name: string }[]>('/forum/categories').then(setCategories).catch(() => {});
    setMoveCategoryId((thread as any)?.category?.id || (thread as any)?.categoryId || '');
  }
  async function confirmMove() {
    if (!thread || !moveCategoryId) return;
    setModBusy(true);
    try { await api.post(`/forum/threads/${thread.id}/move`, { categoryId: moveCategoryId }); setModModal(null); load(); }
    catch (e: any) { setErr(e.message); }
    finally { setModBusy(false); }
  }
  async function toggleLock() {
    if (!thread) return;
    try { await api.post(`/forum/threads/${thread.id}/lock`, { lock: !thread.isLocked }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function toggleHide() {
    if (!thread) return;
    const hidden = (thread as any).isHidden;
    if (!hidden && !confirm('Ẩn bài này? Bài sẽ không hiển thị nhưng không bị xoá.')) return;
    try { await api.post(`/forum/threads/${thread.id}/hide`, { hide: !hidden }); if (!hidden) { alert('Đã ẩn bài.'); } load(); } catch (e: any) { setErr(e.message); }
  }
  async function togglePin() {
    if (!thread) return;
    try { await api.post(`/forum/threads/${thread.id}/pin`, { pin: !thread.isPinned }); load(); } catch (e: any) { setErr(e.message); }
  }
  function openMerge() { setModModal('merge'); setMergeQuery(''); setMergeResults([]); }
  async function searchMergeTargets(q: string) {
    setMergeQuery(q);
    if (q.trim().length < 2) { setMergeResults([]); return; }
    try {
      const r = await api.get<Paginated<Thread>>(`/forum/threads?limit=10&q=${encodeURIComponent(q)}`);
      setMergeResults((r.data || []).filter((t) => t.id !== thread?.id));
    } catch { setMergeResults([]); }
  }
  async function confirmMerge(targetId: string) {
    if (!thread) return;
    if (!confirm('Gộp chủ đề này VÀO chủ đề đã chọn? Chủ đề hiện tại sẽ bị xoá.')) return;
    setModBusy(true);
    try { const r = await api.post<{ mergedInto: string; slug?: string }>(`/forum/threads/${thread.id}/merge`, { targetId }); setModModal(null); window.location.href = r.slug ? `/thread?slug=${r.slug}` : '/'; }
    catch (e: any) { setErr(e.message); setModBusy(false); }
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
  async function donate(postId: string) {
    const raw = prompt('Donate bao nhiêu 💎 Gem cho tác giả?');
    if (!raw) return;
    const amount = parseInt(raw, 10);
    if (!Number.isFinite(amount) || amount <= 0) { alert('Số gem không hợp lệ'); return; }
    const message = prompt('Lời nhắn (tuỳ chọn):') || undefined;
    try { await api.post(`/forum/posts/${postId}/tip`, { amount, message }); alert(`Đã donate ${amount} 💎. Cảm ơn bạn!`); load(); }
    catch (e: any) { alert(e.message); }
  }

  // ── Reading progress: debounced mark-read ──
  const sendReadProgress = useCallback((postId: string) => {
    if (!thread || !user) return;
    if (lastSentPostIdRef.current === postId) return;
    lastSentPostIdRef.current = postId;
    api.post(`/forum/threads/${thread.id}/read-progress`, { postId }).catch(() => {});
  }, [thread, user]);

  const debouncedMarkRead = useCallback((postId: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => sendReadProgress(postId), 1500);
  }, [sendReadProgress]);

  // IntersectionObserver to track visible posts
  useEffect(() => {
    if (!user || !thread || !posts.length) return;
    const postEls = document.querySelectorAll('[data-post-id]');
    if (!postEls.length) return;

    // Track furthest visible post (by order in array)
    const postOrder = posts.map((p) => p.id);
    let furthestIdx = -1;

    observerRef.current = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const pid = (entry.target as HTMLElement).dataset.postId;
        if (!pid) continue;
        const idx = postOrder.indexOf(pid);
        if (idx > furthestIdx) {
          furthestIdx = idx;
          debouncedMarkRead(pid);
        }
      }
    }, { threshold: 0.3 });

    postEls.forEach((el) => observerRef.current!.observe(el));

    return () => {
      observerRef.current?.disconnect();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [user, thread, posts, debouncedMarkRead]);

  // Auto-scroll to last read position on initial load
  useEffect(() => {
    if (!initialLastReadPostId || scrolledToLastRead.current || !posts.length) return;
    scrolledToLastRead.current = true;
    // Small delay to let DOM render
    setTimeout(() => {
      const el = document.getElementById(`post-${initialLastReadPostId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }, [initialLastReadPostId, posts]);

  function toggleSplitPost(postId: string) {
    setSplitSelected((prev) => prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]);
  }
  function cancelSplit() {
    setSplitMode(false); setSplitSelected([]); setSplitTitle('');
  }
  async function confirmSplit() {
    if (!thread || !splitSelected.length || !splitTitle.trim()) return;
    setSplitBusy(true);
    try {
      const r = await api.post<{ slug: string }>(`/forum/threads/${thread.id}/split`, { postIds: splitSelected, title: splitTitle });
      cancelSplit();
      window.location.href = `/thread?slug=${r.slug}`;
    } catch (e: any) { setErr(e.message); setSplitBusy(false); }
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
      {copyToast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-ink-900 px-4 py-2 text-sm text-white shadow-card dark:bg-white dark:text-ink-900">{copyToast}</div>}
      <div className="card p-5">
        <div className="flex items-center gap-2 text-sm text-ink-500">
          {thread.isPinned && <Pin size={14} className="text-amber-500" />}
          {thread.isLocked && <Lock size={14} />}
          {(thread as any).isHidden && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Đã ẩn</span>}
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
          {viewing.total > 0 && (
            <span className="flex items-center gap-1 text-emerald-600" title={viewing.users.map((u) => u.displayName || u.username).join(', ')}>
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {viewing.total} đang xem
            </span>
          )}
        </div>
        {(isMod || (user && thread.author && user.id === thread.author.id)) && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-ink-200/70 pt-3 dark:border-ink-800">
            <button onClick={toggleLock} className="flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-1.5 text-xs hover:bg-ink-200 dark:bg-ink-800"><Lock size={13} /> {thread.isLocked ? 'Mở bài (cho bình luận)' : 'Đóng bài (khoá bình luận)'}</button>
            <button onClick={toggleHide} className="flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-1.5 text-xs text-amber-600 hover:bg-ink-200 dark:bg-ink-800">{(thread as any).isHidden ? 'Hiện bài' : 'Ẩn bài (không xoá)'}</button>
            {isMod && <button onClick={togglePin} className="flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-1.5 text-xs hover:bg-ink-200 dark:bg-ink-800"><Pin size={13} /> {thread.isPinned ? 'Bỏ ghim' : 'Ghim'}</button>}
          </div>
        )}
        {isMod && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={openMove} className="flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-1.5 text-xs hover:bg-ink-200 dark:bg-ink-800"><FolderInput size={13} /> Chuyển mục</button>
            <button onClick={openMerge} className="flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-1.5 text-xs hover:bg-ink-200 dark:bg-ink-800"><Merge size={13} /> Gộp chủ đề</button>
            <button onClick={() => { setSplitMode(true); setSplitSelected([]); setSplitTitle(''); }} className="flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-1.5 text-xs hover:bg-ink-200 dark:bg-ink-800"><Scissors size={13} /> Tách bài</button>
          </div>
        )}
      </div>

      <PollCard threadId={thread.id} />

      {(thread as any).category?.moduleType === 'JOB' && <ThreadJobPanel threadId={thread.id} />}

      <div className="space-y-3">
        {ordered.map((p, idx) => {
          const isFirst = (p as any).isFirstPost;
          const isBest = p.id === bestAnswerId;
          // Show "Bai moi" divider between last-read post and the next unread posts
          const showNewDivider = user && initialLastReadPostId && idx > 0 && ordered[idx - 1].id === initialLastReadPostId && p.id !== initialLastReadPostId;
          return (
            <div key={p.id}>
              {showNewDivider && (
                <div className="my-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-blue-400" />
                  <span className="shrink-0 rounded-full bg-blue-500 px-3 py-0.5 text-xs font-semibold text-white">Bài mới</span>
                  <div className="h-px flex-1 bg-blue-400" />
                </div>
              )}
            <article data-post-id={p.id} id={`post-${p.id}`} className={`card flex overflow-hidden ${isBest ? 'ring-2 ring-emerald-400' : ''} ${splitMode && splitSelected.includes(p.id) ? 'ring-2 ring-orange-400 bg-orange-50/50 dark:bg-orange-950/20' : ''}`}>
              {splitMode && !isFirst && (
                <div className="flex items-center justify-center border-r border-ink-200/70 px-3 dark:border-ink-800">
                  <input type="checkbox" checked={splitSelected.includes(p.id)} onChange={() => toggleSplitPost(p.id)}
                    className="h-4 w-4 cursor-pointer accent-orange-500" />
                </div>
              )}
              <div className="w-32 shrink-0 border-r border-ink-200/70 bg-ink-50 p-4 text-center dark:border-ink-800 dark:bg-ink-900/50">
                {p.author && <div className="mx-auto"><Avatar user={p.author} size={56} /></div>}
                <div className="mt-2 truncate text-sm font-semibold">{p.author?.displayName || p.author?.username}</div>
                {p.author && (
                  <div className="mt-1 flex flex-wrap justify-center gap-1">
                    <UserBadges
                      size="xs"
                      badges={roleBadgesFromUser({
                        role: (p.author as any).role,
                        verifiedBadge: (p.author as any).verifiedBadge,
                      })}
                    />
                  </div>
                )}
                {isFirst && <span className="chip mt-1 bg-brand-100 text-brand-700">Chủ thớt</span>}
              </div>
              <div className="min-w-0 flex-1 p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-ink-500">
                  <span>{(() => { try { return formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}</span>
                  {isBest && <span className="flex items-center gap-1 font-medium text-emerald-600"><Award size={14} /> Câu trả lời hay nhất</span>}
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert" onClick={interceptExternalLink} dangerouslySetInnerHTML={{ __html: p.content }} />
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
                  {/* Tổng donate + nút donate (không tự donate cho mình) */}
                  {(p.tipTotal ?? 0) > 0 && (
                    <span className="flex items-center gap-1 rounded-full bg-fuchsia-100 px-2 py-0.5 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300" title={`${p.tipCount} lượt donate`}>
                      <Gem size={12} /> {p.tipTotal}
                    </span>
                  )}
                  {user && !thread.isLocked && (
                    <button onClick={() => quotePost(p)} className="flex items-center gap-1 text-ink-500 hover:text-brand-600" title="Trích dẫn bài này">
                      <Quote size={14} /> Trích
                    </button>
                  )}
                  {user && p.author && user.id !== p.author.id && (
                    <button onClick={() => donate(p.id)} className="flex items-center gap-1 text-fuchsia-600 hover:text-fuchsia-700">
                      <Gem size={14} /> Donate
                    </button>
                  )}
                  {canManage && !isFirst && (
                    <button onClick={() => markBest(p.id)} className={`ml-auto flex items-center gap-1 ${isBest ? 'text-emerald-600' : 'text-ink-500 hover:text-emerald-600'}`}>
                      <Award size={14} /> {isBest ? 'Bỏ chọn' : 'Chọn là câu trả lời hay nhất'}
                    </button>
                  )}
                </div>
              </div>
            </article>
            </div>
          );
        })}
      </div>

      <div className="card p-4" id="reply-box">
        {user ? (
          thread.isLocked ? (
            <p className="text-center text-sm text-ink-500">Chủ đề đã bị khoá.</p>
          ) : (
            <form onSubmit={submitReply} className="space-y-2">
              {replyDraft && !reply && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                  <span>Có nháp trả lời đã lưu.</span>
                  <button type="button" onClick={() => { setReply(replyDraft); setReplyDraft(null); }} className="rounded bg-amber-500 px-2 py-0.5 font-medium text-white">Khôi phục</button>
                  <button type="button" onClick={() => setReplyDraft(null)} className="px-2 py-0.5 font-medium">Bỏ</button>
                </div>
              )}
              <TipTapEditor value={reply} onChange={setReply} placeholder="Viết trả lời…" autosaveKey={`reply-${thread?.id || 'x'}`} />

              <div className="rounded-lg border border-ink-200 p-3 dark:border-ink-800">
                <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={hiddenOn} onChange={(e) => setHiddenOn(e.target.checked)} /><Lock size={14} /> Thêm nội dung ẩn</label>
                {hiddenOn && (
                  <div className="mt-2 space-y-2">
                    <TipTapEditor value={hidden.content} onChange={(html) => setHidden({ ...hidden, content: html })} placeholder="Nội dung ẩn cho tới khi mở khoá…" />
                    <input className="input" placeholder="Nhãn (tuỳ chọn)" value={hidden.label} onChange={(e) => setHidden({ ...hidden, label: e.target.value })} />
                    <div className="flex flex-wrap items-center gap-2">
                      <select className="input w-auto" value={hidden.gateType} onChange={(e) => setHidden({ ...hidden, gateType: e.target.value })}>
                        <option value="LIKE_REQUIRED">Cần Like</option>
                        <option value="COMMENT_REQUIRED">Cần Bình luận</option>
                        <option value="LIKE_AND_COMMENT">Cần Like & Bình luận</option>
                        <option value="LIKE_OR_COMMENT">Like hoặc Bình luận</option>
                        <option value="GEM_PURCHASE">Mua bằng Gem</option>
                        <option value="LIKE_OR_GEM">Like hoặc Gem</option>
                        <option value="COMMENT_OR_GEM">Bình luận hoặc Gem</option>
                      </select>
                      {['LIKE_REQUIRED', 'LIKE_AND_COMMENT', 'LIKE_OR_COMMENT', 'LIKE_OR_GEM'].includes(hidden.gateType) && <label className="text-xs text-ink-500">Like ≥ <input type="number" min={1} className="input ml-1 w-16" value={hidden.likeRequired} onChange={(e) => setHidden({ ...hidden, likeRequired: Number(e.target.value) })} /></label>}
                      {['COMMENT_REQUIRED', 'LIKE_AND_COMMENT', 'LIKE_OR_COMMENT', 'COMMENT_OR_GEM'].includes(hidden.gateType) && <label className="text-xs text-ink-500">Bình luận ≥ <input type="number" min={1} className="input ml-1 w-16" value={hidden.commentRequired} onChange={(e) => setHidden({ ...hidden, commentRequired: Number(e.target.value) })} /></label>}
                      {['GEM_PURCHASE', 'LIKE_OR_GEM', 'COMMENT_OR_GEM'].includes(hidden.gateType) && <label className="text-xs text-ink-500">Giá Gem <input type="number" min={1} className="input ml-1 w-20" value={hidden.gemPrice} onChange={(e) => setHidden({ ...hidden, gemPrice: Number(e.target.value) })} /></label>}
                    </div>
                  </div>
                )}
              </div>

              {err && <p className="text-sm text-red-500">{err}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={saveReplyDraft} className="btn-outline inline-flex items-center gap-1"><Save size={15} /> Lưu nháp</button>
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

      {modModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !modBusy && setModModal(null)}>
          <div className="card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {modModal === 'move' ? (
              <>
                <h3 className="flex items-center gap-2 font-semibold"><FolderInput size={16} /> Chuyển chủ đề sang chuyên mục khác</h3>
                <select className="input mt-3 w-full" value={moveCategoryId} onChange={(e) => setMoveCategoryId(e.target.value)}>
                  <option value="">— Chọn chuyên mục —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setModModal(null)} className="rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Hủy</button>
                  <button onClick={confirmMove} disabled={modBusy || !moveCategoryId} className="btn-primary !py-1.5 text-sm disabled:opacity-50">{modBusy ? 'Đang chuyển…' : 'Chuyển'}</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="flex items-center gap-2 font-semibold"><Merge size={16} /> Gộp chủ đề này vào…</h3>
                <p className="mt-0.5 text-xs text-ink-500">Tìm chủ đề đích. Chủ đề hiện tại sẽ bị xoá, các bài viết được chuyển sang chủ đề đích.</p>
                <input autoFocus className="input mt-3 w-full" placeholder="Gõ tên chủ đề đích…" value={mergeQuery} onChange={(e) => searchMergeTargets(e.target.value)} />
                <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
                  {mergeResults.map((t) => (
                    <button key={t.id} onClick={() => confirmMerge(t.id)} disabled={modBusy}
                      className="block w-full truncate rounded-lg border border-ink-200 px-3 py-2 text-left text-sm hover:bg-ink-50 disabled:opacity-50 dark:border-ink-800 dark:hover:bg-ink-800/50">
                      {t.title}
                    </button>
                  ))}
                  {mergeQuery.trim().length >= 2 && mergeResults.length === 0 && <p className="py-2 text-center text-xs text-ink-500">Không tìm thấy chủ đề phù hợp.</p>}
                </div>
                <div className="mt-3 flex justify-end">
                  <button onClick={() => setModModal(null)} className="rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Hủy</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {splitMode && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-ink-800 dark:bg-ink-950/95">
          <div className="mx-auto flex max-w-4xl items-center gap-3">
            <span className="shrink-0 text-sm font-medium text-orange-600">
              <Scissors size={14} className="mr-1 inline" />
              Tách {splitSelected.length} bài
            </span>
            <input
              type="text" value={splitTitle} onChange={(e) => setSplitTitle(e.target.value)}
              placeholder="Tiêu đề chủ đề mới…"
              className="input flex-1 !py-1.5 text-sm"
            />
            <button
              onClick={confirmSplit}
              disabled={splitBusy || !splitSelected.length || !splitTitle.trim()}
              className="btn-primary shrink-0 !py-1.5 text-sm"
            >
              {splitBusy ? 'Đang tách…' : 'Tách'}
            </button>
            <button onClick={cancelSplit} className="shrink-0 rounded-lg bg-ink-100 px-3 py-1.5 text-sm hover:bg-ink-200 dark:bg-ink-800">
              Hủy
            </button>
          </div>
        </div>
      )}
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
