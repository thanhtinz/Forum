'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ThumbsUp, MessageCircle, Eye, Lock, Pin, Bell, BellRing, BarChart3, CheckCircle2, Award, Bookmark, BookmarkCheck, SmilePlus, Clock, FolderInput, Merge, Gem, Scissors, Quote, Reply, X as XIcon, Pencil, History, AlertTriangle, UserX, Shuffle, Trash2, Flag, MoreVertical, Feather, AtSign, Copy as Link2Icon, ChevronLeft, ChevronRight, CalendarDays, MessageSquare, Coins } from 'lucide-react';
import { api } from '@/lib/api';
import { cssToStyle } from '@/lib/nameEffect';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import { UserBadges, roleBadgesFromUser } from '@/components/UserBadges';
import type { Thread, Post, Paginated } from '@/lib/types';
import { interceptExternalLink } from '@/lib/externalLink';
import TipTapEditor from '@/components/TipTapEditor';
import { AdBanner } from '@/components/AdBanner';
import { GATE_OPTIONS, needLike, needComment, needLikeInput, needCommentInput, needGem, REACTIONS, REPORT_TYPES } from '@/lib/constants';

// Ước tính thời gian đọc (200 từ/phút) từ HTML các bài viết
function readingTime(posts: { content: string }[]): number {
  const text = posts.map((p) => p.content.replace(/<[^>]+>/g, ' ')).join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Icon MXH cho nút chia sẻ (lucide-react không có logo thương hiệu, nên vẽ SVG tay)
function FacebookIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
function XLogoIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function TelegramIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

// Dải huy hiệu thành tích của tác giả (khác role/level) — hiện 1 huy hiệu/lần, phân trang khi có nhiều
function AuthorBadgeCarousel({ badges }: { badges: { name: string; icon: string; color: string }[] }) {
  const [idx, setIdx] = useState(0);
  if (!badges.length) return null;
  const b = badges[idx % badges.length];
  return (
    <div className="mt-3 border-t border-ink-200/70 pt-2 dark:border-ink-800">
      <div className="flex justify-center">
        <UserBadges size="sm" badges={[{ key: `earned-${idx}`, label: b.name, icon: b.icon, color: b.color, kind: 'milestone' }]} />
      </div>
      {badges.length > 1 && (
        <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-ink-400">
          <button type="button" onClick={() => setIdx((i) => (i - 1 + badges.length) % badges.length)} className="rounded p-0.5 hover:bg-ink-100 dark:hover:bg-ink-800"><ChevronLeft size={12} /></button>
          <span>{idx + 1}/{badges.length}</span>
          <button type="button" onClick={() => setIdx((i) => (i + 1) % badges.length)} className="rounded p-0.5 hover:bg-ink-100 dark:hover:bg-ink-800"><ChevronRight size={12} /></button>
        </div>
      )}
    </div>
  );
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
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug') || '';
  const initialPage = Math.max(1, Number(searchParams.get('page') || 1));
  const { user } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [firstPost, setFirstPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postPage, setPostPage] = useState(initialPage);
  const [postTotalPages, setPostTotalPages] = useState(1);
  const POST_LIMIT = 10;
  const [reply, setReply] = useState('');
  const [replyDraft, setReplyDraft] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState('');
  // Nội dung ẩn — dùng khi SỬA bài (xem/sửa section đã có, hoặc thêm mới cho bài gốc)
  const [hiddenOn, setHiddenOn] = useState(false);
  const [hidden, setHidden] = useState({ content: '', gateType: 'LIKE_AND_COMMENT', likeRequired: 1, commentRequired: 1, gemPrice: 10, label: '' });
  const [editHiddenSectionId, setEditHiddenSectionId] = useState<string | null>(null);
  const [unlockBusy, setUnlockBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [replyToPost, setReplyToPost] = useState<{ id: string; authorName: string } | null>(null);
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

  // ── Post title edit (used inside first-post inline edit form) ──
  const [editTitle, setEditTitle] = useState('');
  // ── Post edit ──
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editReason, setEditReason] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  // ── Edit history modal ──
  const [historyPostId, setHistoryPostId] = useState<string | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  // ── Warn user modal ──
  const [warnModal, setWarnModal] = useState<{ postId: string; userId: string; username: string } | null>(null);
  const [warnReason, setWarnReason] = useState('');
  const [warnPoints, setWarnPoints] = useState(1);
  const [warnBusy, setWarnBusy] = useState(false);
  // ── Reply ban modal ──
  const [replyBanModal, setReplyBanModal] = useState<{ userId: string; username: string } | null>(null);
  const [replyBanReason, setReplyBanReason] = useState('');
  const [replyBanExpiry, setReplyBanExpiry] = useState('');
  const [replyBanBusy, setReplyBanBusy] = useState(false);
  // ── Move post modal ──
  const [movePostModal, setMovePostModal] = useState<string | null>(null);
  const [movePostTarget, setMovePostTarget] = useState('');
  const [movePostResults, setMovePostResults] = useState<Thread[]>([]);
  const [movePostBusy, setMovePostBusy] = useState(false);
  // ── Similar threads ──
  const [similarThreads, setSimilarThreads] = useState<Thread[]>([]);
  const [latestThreads, setLatestThreads] = useState<Thread[]>([]);
  // ── Report modal ──
  const [reportModal, setReportModal] = useState<{ targetType: string; targetId: string; reportedUserId?: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportType, setReportType] = useState('SPAM');
  const [reportBusy, setReportBusy] = useState(false);
  const [replyPreview, setReplyPreview] = useState(false);
  const [initialLastReadPostId, setInitialLastReadPostId] = useState<string | null>(null);
  const lastSentPostIdRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrolledToLastRead = useRef(false);
  const [threadMenu, setThreadMenu] = useState(false);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const threadMenuRef = useRef<HTMLDivElement>(null);

  const [viewing, setViewing] = useState<{ total: number; users: { id: string; username: string; displayName?: string | null; avatar?: string | null }[] }>({ total: 0, users: [] });

  const isMod = user && (user.role === 'ADMIN' || user.role === 'MODERATOR');
  const canManage = thread && user && ((thread as any).author?.id === user.id || isMod);
  const bestAnswerId = thread ? (thread as any).bestAnswerId : null;

  async function load() {
    try {
      const t = await api.get<Thread>(`/forum/threads/${slug}`);
      setThread(t);
      const p = await api.get<Paginated<Post> & { firstPost: Post | null }>(`/forum/threads/${t.id}/posts?limit=${POST_LIMIT}&page=${initialPage}`);
      setFirstPost(p.firstPost);
      setPosts(p.data);
      setPostTotalPages(p.meta?.totalPages ?? 1);
      api.get<{ total: number; users: any[] }>(`/community/threads/${t.id}/viewing`).then(setViewing).catch(() => {});
      if ((t as any).category?.id) {
        api.get<{ data: Thread[] }>(`/forum/threads?categoryId=${(t as any).category.id}&limit=6&sortBy=lastPost`)
          .then((r) => setSimilarThreads((r.data || []).filter((x) => x.id !== t.id).slice(0, 5)))
          .catch(() => {});
      }
      api.get<{ data: Thread[] }>(`/forum/threads?limit=6&sortBy=createdAt`)
        .then((r) => setLatestThreads((r.data || []).filter((x) => x.id !== t.id).slice(0, 5)))
        .catch(() => {});
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

  async function loadPostPage(page: number) {
    if (!thread) return;
    try {
      const p = await api.get<Paginated<Post> & { firstPost: Post | null }>(`/forum/threads/${thread.id}/posts?limit=${POST_LIMIT}&page=${page}`);
      setFirstPost(p.firstPost);
      setPosts(p.data);
      setPostTotalPages(p.meta?.totalPages ?? 1);
      setPostPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) { setErr(e.message); }
  }

  function quotePost(p: Post) {
    const name = p.author?.username || 'ẩn danh';
    const html = `<blockquote><p><strong>@${name}</strong> đã viết:</p>${p.content}</blockquote><p></p>`;
    setReply((prev) => (prev || '') + html);
    document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' });
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
      const r = await api.post<any>('/forum/posts', { threadId: thread.id, content: reply, parentId: replyToPost?.id || null });
      setReply(''); setReplyToPost(null);
      if (r?.pendingApproval) { setErr(''); alert('Trả lời của bạn đang chờ kiểm duyệt và sẽ hiển thị sau khi được duyệt.'); return; }
      // Xoá nháp trả lời của thread này (nếu có)
      api.get<any[]>('/forum/drafts').then((ds) => {
        const d = (ds || []).find((x) => x.threadId === thread.id);
        if (d) api.del(`/forum/drafts/${d.id}`).catch(() => {});
      }).catch(() => {});
      // Dò trang cuối thật sự (số bình luận vừa tăng có thể sinh thêm trang mới)
      const probe = await api.get<Paginated<Post> & { firstPost: Post | null }>(`/forum/threads/${thread.id}/posts?limit=${POST_LIMIT}&page=999999`);
      const lastPage = probe.meta?.totalPages || 1;
      const p = await api.get<Paginated<Post> & { firstPost: Post | null }>(`/forum/threads/${thread.id}/posts?limit=${POST_LIMIT}&page=${lastPage}`);
      setFirstPost(p.firstPost);
      setPosts(p.data);
      setPostTotalPages(lastPage);
      setPostPage(lastPage);
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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (threadMenuRef.current && !threadMenuRef.current.contains(e.target as Node)) setThreadMenu(false);
      if (!(e.target as HTMLElement)?.closest?.('.emoji-picker-wrap')) setEmojiPickerFor(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // ── Post edit actions ──
  async function startEdit(p: Post) {
    setEditingPostId(p.id);
    setEditContent((p as any).contentRaw || p.content);
    setEditReason('');
    if ((p as any).isFirstPost && thread) setEditTitle(thread.title);
    // Nội dung ẩn: tải lại section đã có (nếu có) để hiện ra khi sửa
    setHiddenOn(false);
    setHidden({ content: '', gateType: 'LIKE_AND_COMMENT', likeRequired: 1, commentRequired: 1, gemPrice: 10, label: '' });
    setEditHiddenSectionId(null);
    try {
      const sections = await api.get<any[]>(`/hidden-content/sections/post/${p.id}/edit`);
      const s = sections?.[0];
      if (s) {
        setEditHiddenSectionId(s.id);
        setHiddenOn(true);
        setHidden({
          content: s.contentRaw || '',
          gateType: s.gateType || 'LIKE_AND_COMMENT',
          likeRequired: s.likeRequired || 1,
          commentRequired: s.commentRequired || 1,
          gemPrice: s.gemPrice || 10,
          label: s.label || '',
        });
      }
    } catch { /* chưa có nội dung ẩn hoặc không có quyền -> bỏ qua */ }
  }
  async function submitEdit() {
    if (!editingPostId || !editContent.trim()) return;
    setEditBusy(true);
    try {
      await api.patch(`/forum/posts/${editingPostId}`, { content: editContent, reason: editReason || undefined });
      const isEditingFirstPost = editingPostId === firstPost?.id;
      if (isEditingFirstPost && thread && editTitle.trim() && editTitle.trim() !== thread.title) {
        await api.patch(`/forum/threads/${thread.id}`, { title: editTitle.trim() });
      }
      // Nội dung ẩn: cập nhật section đã có, hoặc tạo mới nếu vừa bật
      if (hiddenOn && hidden.content.trim()) {
        const g = hidden.gateType;
        const body: any = { contentRaw: hidden.content, gateType: g };
        if (hidden.label.trim()) body.label = hidden.label.trim();
        if (needLikeInput(g)) body.likeRequired = Math.max(1, hidden.likeRequired);
        if (needCommentInput(g)) body.commentRequired = Math.max(1, hidden.commentRequired);
        if (needGem(g)) body.gemPrice = Math.max(1, hidden.gemPrice);
        if (editHiddenSectionId) await api.patch(`/hidden-content/sections/${editHiddenSectionId}`, body).catch(() => {});
        else await api.post('/hidden-content/sections', { ...body, postId: editingPostId }).catch(() => {});
      }
      setEditingPostId(null);
      setEditHiddenSectionId(null);
      load();
    } catch (e: any) { setErr(e.message); }
    finally { setEditBusy(false); }
  }
  // ── Nội dung ẩn: mở khoá bằng Gem ──
  async function unlockHidden(hiddenSectionId: string) {
    setUnlockBusy(hiddenSectionId);
    try { await api.post('/hidden-content/unlock/gem', { hiddenSectionId }); load(); }
    catch (e: any) { setErr(e.message); }
    finally { setUnlockBusy(null); }
  }
  function gateDescription(hs: any): string {
    const parts: string[] = [];
    if (needLike(hs.gateType) && hs.likeRequired) parts.push(`${hs.currentLikes ?? 0}/${hs.likeRequired} like`);
    if (needComment(hs.gateType) && hs.commentRequired) parts.push(`${hs.currentComments ?? 0}/${hs.commentRequired} bình luận`);
    const text = parts.join(hs.gateType === 'LIKE_AND_COMMENT' ? ' và ' : ' hoặc ');
    if (needGem(hs.gateType) && hs.gemPrice) return text ? `${text} — hoặc mở ngay bằng ${hs.gemPrice} Gem` : `Mở khoá bằng ${hs.gemPrice} Gem`;
    return text || 'Nội dung đang bị khoá';
  }
  async function loadHistory(postId: string) {
    setHistoryPostId(postId); setHistoryLoading(true);
    try { const h = await api.get<any[]>(`/forum/posts/${postId}/history`); setHistoryItems(h || []); }
    catch { setHistoryItems([]); }
    finally { setHistoryLoading(false); }
  }
  async function deletePostAction(postId: string) {
    if (!confirm('Xoá bài viết này?')) return;
    try { await api.del(`/forum/posts/${postId}`); load(); } catch (e: any) { setErr(e.message); }
  }
  async function submitWarn() {
    if (!warnModal || !warnReason.trim()) return;
    setWarnBusy(true);
    try {
      await api.post(`/forum/admin/warn/${warnModal.userId}`, { reason: warnReason, points: warnPoints, postId: warnModal.postId });
      setWarnModal(null); setWarnReason(''); setWarnPoints(1);
      alert('Đã gửi cảnh cáo!');
    } catch (e: any) { setErr(e.message); }
    finally { setWarnBusy(false); }
  }
  async function submitReplyBan() {
    if (!replyBanModal || !thread) return;
    setReplyBanBusy(true);
    try {
      await api.post(`/forum/threads/${thread.id}/reply-ban`, {
        userId: replyBanModal.userId,
        reason: replyBanReason || undefined,
        expiresAt: replyBanExpiry || undefined,
      });
      setReplyBanModal(null); setReplyBanReason(''); setReplyBanExpiry('');
      alert('Đã cấm trả lời trong chủ đề này.');
    } catch (e: any) { setErr(e.message); }
    finally { setReplyBanBusy(false); }
  }
  async function searchMovePostTargets(q: string) {
    setMovePostTarget(q);
    if (q.trim().length < 2) { setMovePostResults([]); return; }
    try {
      const r = await api.get<any>(`/forum/threads?limit=10&q=${encodeURIComponent(q)}`);
      setMovePostResults((r.data || []).filter((t: Thread) => t.id !== thread?.id));
    } catch { setMovePostResults([]); }
  }
  async function confirmMovePost(targetThreadId: string) {
    if (!movePostModal) return;
    setMovePostBusy(true);
    try {
      await api.post(`/forum/posts/${movePostModal}/move`, { targetThreadId });
      setMovePostModal(null); setMovePostTarget(''); setMovePostResults([]);
      load();
    } catch (e: any) { setErr(e.message); setMovePostBusy(false); }
  }

  async function submitReport() {
    if (!reportModal || !reportReason.trim()) return;
    setReportBusy(true);
    try {
      await api.post('/moderation/reports', {
        targetType: reportModal.targetType,
        targetId: reportModal.targetId,
        reportedUserId: reportModal.reportedUserId,
        type: reportType,
        reason: reportReason,
      });
      setReportModal(null); setReportReason(''); setReportType('SPAM');
      alert('Đã gửi báo cáo. Cảm ơn bạn!');
    } catch (e: any) { setErr(e.message); }
    finally { setReportBusy(false); }
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (err && !thread) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!thread) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Đưa best answer lên đầu nếu có
  const sortedPosts = bestAnswerId ? [...posts].sort((a, b) => {
    if (a.id === bestAnswerId) return -1; if (b.id === bestAnswerId) return 1; return 0;
  }) : posts;

  // Xây dựng cây bài viết (threading) và làm phẳng theo DFS
  type PostWithDepth = Post & { _depth: number };
  function flattenPostTree(list: Post[]): PostWithDepth[] {
    const map = new Map<string, Post & { _children: Post[] }>();
    const roots: (Post & { _children: Post[] })[] = [];
    for (const p of list) map.set(p.id, { ...p, _children: [] });
    for (const p of list) {
      const node = map.get(p.id)!;
      if (p.parentId && map.has(p.parentId)) map.get(p.parentId)!._children.push(node);
      else roots.push(node);
    }
    const result: PostWithDepth[] = [];
    function dfs(nodes: (Post & { _children: Post[] })[], depth: number) {
      for (const n of nodes) { result.push({ ...n, _depth: depth }); if ((n as any)._children.length) dfs((n as any)._children, depth + 1); }
    }
    dfs(roots, 0);
    return result;
  }
  const ordered = flattenPostTree(sortedPosts);

  const commentBox = (
    <div id="comment-form">
      {user ? (
        thread.isLocked ? (
          <p className="px-4 py-3 text-center text-sm text-ink-500">Chủ đề đã bị khoá.</p>
        ) : (
          <form onSubmit={submitReply} className="space-y-2">
            {replyToPost && (
              <div className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800 dark:bg-brand-950/30 dark:text-brand-200">
                <Reply size={13} /> <span>Đang trả lời bài của <strong>@{replyToPost.authorName}</strong></span>
                <button type="button" onClick={() => setReplyToPost(null)} className="ml-auto rounded p-0.5 hover:bg-brand-200/50"><XIcon size={13} /></button>
              </div>
            )}
            {replyDraft && !reply && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <span>Có nháp trả lời đã lưu.</span>
                <button type="button" onClick={() => { setReply(replyDraft); setReplyDraft(null); }} className="rounded bg-amber-500 px-2 py-0.5 font-medium text-white">Khôi phục</button>
                <button type="button" onClick={() => setReplyDraft(null)} className="px-2 py-0.5 font-medium">Bỏ</button>
              </div>
            )}
            {replyPreview ? (
              <div className="prose prose-sm min-h-[80px] max-w-none rounded-lg border border-ink-200 p-4 dark:border-ink-800 dark:prose-invert" onClick={interceptExternalLink} dangerouslySetInnerHTML={{ __html: reply || '<p style="color:#94a3b8">Chưa có nội dung…</p>' }} />
            ) : (
              <TipTapEditor value={reply} onChange={setReply} placeholder="Viết bình luận…" autosaveKey={`reply-${thread?.id || 'x'}`} />
            )}
            {err && <p className="text-sm text-red-500">{err}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReplyPreview((v) => !v)} className="btn-outline !py-1.5 text-sm">
                {replyPreview ? '← Sửa' : 'Xem trước'}
              </button>
              <button className="btn-primary" type="submit">Gửi bình luận</button>
            </div>
          </form>
        )
      ) : (
        <p className="px-4 py-3 text-center text-sm text-ink-500">
          Vui lòng <a href="/login" className="text-brand-600 font-medium">đăng nhập</a> để trả lời.
        </p>
      )}
    </div>
  );

  function renderPostArticle(p: Post, postNumber: number, isFirst: boolean, isBest: boolean, depth: number, showNewDivider?: boolean) {
    return (
      <div key={p.id} style={depth > 0 ? { marginLeft: `${Math.min(depth, 4) * 1.5}rem` } : undefined}>
        {showNewDivider && (
          <div className="my-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-blue-400" />
            <span className="shrink-0 rounded-full bg-blue-500 px-3 py-0.5 text-xs font-semibold text-white">Bài mới</span>
            <div className="h-px flex-1 bg-blue-400" />
          </div>
        )}
      <article data-post-id={p.id} id={`post-${p.id}`} className={`card overflow-hidden ${depth > 0 ? 'border-l-4 border-brand-200 dark:border-brand-900' : ''} ${isBest ? 'ring-2 ring-emerald-400' : ''} ${splitMode && splitSelected.includes(p.id) ? 'ring-2 ring-orange-400 bg-orange-50/50 dark:bg-orange-950/20' : ''}`}>
        {splitMode && !isFirst && (
          <div className="flex items-center gap-2 border-b border-ink-200/70 px-3 py-2 dark:border-ink-800">
            <input type="checkbox" checked={splitSelected.includes(p.id)} onChange={() => toggleSplitPost(p.id)}
              className="h-4 w-4 cursor-pointer accent-orange-500" />
          </div>
        )}
        {/* Mobile: horizontal author bar */}
        <div className="flex items-center gap-3 border-b border-ink-200/70 bg-ink-50 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-900/50 sm:hidden">
          {p.author && <Avatar user={p.author} size={36} />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-sm font-semibold">
              <span className="truncate" style={cssToStyle((p.author as any)?.nameEffectCss)}>{p.author?.displayName || p.author?.username}</span>
              {(p.author as any)?.shopBadgeUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={(p.author as any).shopBadgeUrl} alt="" className="h-4 w-4 shrink-0 object-contain" />}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              {p.author && (p.author as any)?.levelName && <UserBadges size="xs" badges={[{ key: 'level', label: (p.author as any).levelName, icon: (p.author as any).levelIcon || 'Star', color: (p.author as any).levelColor || 'gray', kind: 'level' as const }]} />}
              {p.author && <UserBadges size="xs" badges={roleBadgesFromUser({ role: (p.author as any).role, verifiedBadge: (p.author as any).verifiedBadge })} />}
              {isFirst && <span className="chip bg-brand-100 text-brand-700 text-[10px] inline-flex items-center gap-0.5"><Feather size={9} />Tác giả</span>}
            </div>
          </div>
        </div>
        <div className="flex">
          {/* sm+ vertical sidebar */}
          <div className="hidden w-40 shrink-0 border-r border-ink-200/70 bg-ink-50 p-4 text-center dark:border-ink-800 dark:bg-ink-900/50 sm:block">
            {p.author && <div className="mx-auto"><Avatar user={p.author} size={56} /></div>}
            <div className="mt-2 flex items-center justify-center gap-1 truncate text-sm font-semibold">
              <span className="truncate" style={cssToStyle((p.author as any)?.nameEffectCss)}>{p.author?.displayName || p.author?.username}</span>
              {(p.author as any)?.shopBadgeUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={(p.author as any).shopBadgeUrl} alt="" className="h-5 w-5 shrink-0 object-contain" />}
            </div>
            {p.author && (
              <div className="mt-1 flex flex-col items-center gap-1">
                {(p.author as any)?.levelName && (
                  <UserBadges size="xs" badges={[{ key: 'level', label: (p.author as any).levelName, icon: (p.author as any).levelIcon || 'Star', color: (p.author as any).levelColor || 'gray', kind: 'level' as const }]} />
                )}
                <div className="flex flex-wrap justify-center gap-1">
                  <UserBadges size="xs" badges={roleBadgesFromUser({ role: (p.author as any).role, verifiedBadge: (p.author as any).verifiedBadge })} />
                </div>
              </div>
            )}
            {isFirst && <span className="chip mt-1 bg-brand-100 text-brand-700 inline-flex items-center gap-1"><Feather size={10} />Tác giả</span>}
            {p.author && (
              <div className="mt-3 space-y-1 border-t border-ink-200/70 pt-2 text-left text-[11px] text-ink-500 dark:border-ink-800">
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1"><CalendarDays size={11} /> Tham gia</span>
                  <span className="font-medium text-ink-700 dark:text-ink-300">{(() => { try { return new Date((p.author as any).createdAt).toLocaleDateString('vi-VN'); } catch { return '—'; } })()}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1"><MessageSquare size={11} /> Bài viết</span>
                  <span className="font-medium text-ink-700 dark:text-ink-300">{(p.author as any).postCount ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1"><ThumbsUp size={11} /> Lượt thích</span>
                  <span className="font-medium text-ink-700 dark:text-ink-300">{(p.author as any).reputationScore ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1"><Coins size={11} /> Coins</span>
                  <span className="font-medium text-ink-700 dark:text-ink-300">{(p.author as any).gemBalance ?? 0}</span>
                </div>
              </div>
            )}
            {(p.author as any)?.badges?.length > 0 && <AuthorBadgeCarousel badges={(p.author as any).badges} />}
          </div>
          <div className="min-w-0 flex-1 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-ink-500">
            <span className="flex items-center gap-2">
              {(() => { try { return formatDistanceToNow(new Date(p.createdAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}
              <a href={`#post-${p.id}`} className="text-ink-400 hover:text-brand-600">#{postNumber}</a>
            </span>
            <div className="flex items-center gap-2">
              {isBest && <span className="flex items-center gap-1 font-medium text-emerald-600"><Award size={14} /> Câu trả lời hay nhất</span>}
              {canManage && !isFirst && (
                <button onClick={() => markBest(p.id)} className={`flex items-center gap-1 ${isBest ? 'text-emerald-600 hover:text-emerald-700' : 'text-ink-400 hover:text-emerald-600'}`}>
                  <Award size={13} /> {isBest ? 'Bỏ chọn' : 'Hay nhất'}
                </button>
              )}
            </div>
          </div>
          {editingPostId === p.id ? (
            <div className="space-y-2">
              {isFirst && (
                <input autoFocus className="input w-full text-lg font-bold" placeholder="Tiêu đề bài viết…" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              )}
              <TipTapEditor value={editContent} onChange={setEditContent} placeholder="Nội dung bài viết…" />
              {(isFirst || editHiddenSectionId) && (
                <div className="rounded-lg border border-ink-200 p-3 dark:border-ink-800">
                  {editHiddenSectionId ? (
                    <p className="flex items-center gap-2 text-sm font-medium"><Lock size={14} /> Nội dung ẩn</p>
                  ) : (
                    <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={hiddenOn} onChange={(e) => setHiddenOn(e.target.checked)} /><Lock size={14} /> Thêm nội dung ẩn</label>
                  )}
                  {hiddenOn && (
                    <div className="mt-2 space-y-2">
                      <TipTapEditor value={hidden.content} onChange={(html) => setHidden({ ...hidden, content: html })} placeholder="Nội dung ẩn cho tới khi mở khoá…" />
                      <input className="input" placeholder="Nhãn (tuỳ chọn)" value={hidden.label} onChange={(e) => setHidden({ ...hidden, label: e.target.value })} />
                      <div className="flex flex-wrap items-center gap-2">
                        <select className="input w-auto" value={hidden.gateType} onChange={(e) => setHidden({ ...hidden, gateType: e.target.value })}>
                          {GATE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                        </select>
                        {needLikeInput(hidden.gateType) && <label className="text-xs text-ink-500">Tổng like ≥ <input type="number" min={1} className="input ml-1 w-16" value={hidden.likeRequired} onChange={(e) => setHidden({ ...hidden, likeRequired: Number(e.target.value) })} /></label>}
                        {needCommentInput(hidden.gateType) && <label className="text-xs text-ink-500">Tổng bình luận ≥ <input type="number" min={1} className="input ml-1 w-16" value={hidden.commentRequired} onChange={(e) => setHidden({ ...hidden, commentRequired: Number(e.target.value) })} /></label>}
                        {needGem(hidden.gateType) && <label className="text-xs text-ink-500">Giá Gem <input type="number" min={1} className="input ml-1 w-20" value={hidden.gemPrice} onChange={(e) => setHidden({ ...hidden, gemPrice: Number(e.target.value) })} /></label>}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <input className="input w-full text-sm" placeholder="Lý do chỉnh sửa (tuỳ chọn)…" value={editReason} onChange={(e) => setEditReason(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={submitEdit} disabled={editBusy} className="btn-primary !py-1 text-xs">{editBusy ? 'Đang lưu…' : 'Lưu'}</button>
                <button onClick={() => setEditingPostId(null)} className="rounded bg-ink-100 px-3 py-1 text-xs dark:bg-ink-800">Hủy</button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert" onClick={interceptExternalLink} dangerouslySetInnerHTML={{ __html: p.content }} />
          )}
          {editingPostId !== p.id && (p as any).hiddenSections?.map((hs: any) => (
            hs.isUnlocked ? (
              <div key={hs.id} className="prose prose-sm mt-3 max-w-none dark:prose-invert" onClick={interceptExternalLink} dangerouslySetInnerHTML={{ __html: hs.content || '' }} />
            ) : (
              <div key={hs.id} className="mt-3 flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-ink-300 bg-ink-50/70 p-3 py-6 text-center text-sm dark:border-ink-700 dark:bg-ink-900/40">
                <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                  <Lock size={26} />
                </span>
                <p className="font-semibold">{hs.label || 'Nội dung này đã bị ẩn'}</p>
                <p className="text-xs text-ink-500">{gateDescription(hs)}</p>
                {needGem(hs.gateType) && hs.gemPrice ? (
                  user ? (
                    <button type="button" disabled={unlockBusy === hs.id} onClick={() => unlockHidden(hs.id)} className="btn-primary mt-1 inline-flex items-center gap-1 !py-1.5 text-xs disabled:opacity-50">
                      <Gem size={12} /> {unlockBusy === hs.id ? 'Đang mở…' : `Mở khoá bằng ${hs.gemPrice} Gem`}
                    </button>
                  ) : (
                    <p className="text-xs text-ink-400">Đăng nhập để mở khoá bằng Gem.</p>
                  )
                ) : null}
              </div>
            )
          ))}
          {(p as any).editCount > 0 && editingPostId !== p.id && (
            <button onClick={() => loadHistory(p.id)} className="mt-1 flex items-center gap-1 text-[11px] text-ink-400 hover:text-ink-600">
              <History size={11} /> Đã sửa {(p as any).editCount} lần
            </button>
          )}
          {/* Signature */}
          {(p.author as any)?.signature && editingPostId !== p.id && (
            <div className="mt-3 border-t border-ink-200/60 pt-2 text-xs text-ink-400 italic dark:border-ink-800/60 whitespace-pre-line">
              {(p.author as any).signature}
            </div>
          )}
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink-100 pt-3 text-xs dark:border-ink-800/60">
            {/* Left: Report + mod actions */}
            <div className="flex flex-wrap items-center gap-2">
              {user && p.author && user.id !== p.author.id && (
                <button onClick={() => { setReportModal({ targetType: 'post', targetId: p.id, reportedUserId: p.author?.id }); setReportReason(''); setReportType('SPAM'); }} className="flex items-center gap-1 text-ink-400 hover:text-red-500">
                  <Flag size={13} /> Report
                </button>
              )}
              {isMod && !isFirst && (
                <>
                  <button onClick={() => deletePostAction(p.id)} className="flex items-center gap-1 text-red-400 hover:text-red-600">
                    <Trash2 size={13} /> Xoá
                  </button>
                  {p.author && p.author.id !== user.id && (
                    <>
                      <button onClick={() => { setWarnModal({ postId: p.id, userId: p.author!.id, username: p.author?.displayName || p.author?.username || '' }); setWarnReason(''); setWarnPoints(1); }} className="flex items-center gap-1 text-amber-500 hover:text-amber-700">
                        <AlertTriangle size={13} /> Cảnh cáo
                      </button>
                      <button onClick={() => { setReplyBanModal({ userId: p.author!.id, username: p.author?.displayName || p.author?.username || '' }); setReplyBanReason(''); setReplyBanExpiry(''); }} className="flex items-center gap-1 text-orange-500 hover:text-orange-700">
                        <UserX size={13} /> Cấm trả lời
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
            {/* Right: reaction bubbles + main actions */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Existing reaction bubbles */}
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
              {/* Emoji picker */}
              {user && (
                <div className="emoji-picker-wrap relative">
                  <button type="button" onClick={() => setEmojiPickerFor((cur) => (cur === p.id ? null : p.id))}
                    className="flex items-center gap-1 rounded-full border border-dashed border-ink-300 px-2 py-0.5 text-ink-500 hover:text-brand-600 dark:border-ink-700"><SmilePlus size={14} /></button>
                  {emojiPickerFor === p.id && (
                    <div className="absolute bottom-full left-1/2 z-10 mb-1 flex -translate-x-1/2 gap-1 rounded-lg border border-ink-200 bg-white p-1 shadow-card dark:border-ink-800 dark:bg-ink-900">
                      {REACTIONS.map((e) => (
                        <button key={e} onClick={() => { react(p.id, e); setEmojiPickerFor(null); }} className="rounded p-1 text-base hover:bg-ink-100 dark:hover:bg-ink-800">{e}</button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* Tip total */}
              {(p.tipTotal ?? 0) > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-fuchsia-100 px-2 py-0.5 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300" title={`${p.tipCount} lượt donate`}>
                  <Gem size={12} /> {p.tipTotal}
                </span>
              )}
              {/* Donate */}
              {user && p.author && user.id !== p.author.id && (
                <button onClick={() => donate(p.id)} className="flex items-center gap-1 text-fuchsia-500 hover:text-fuchsia-700">
                  <Gem size={13} /> Donate
                </button>
              )}
              {/* Quote */}
              {user && !thread!.isLocked && (
                <button onClick={() => quotePost(p)} className="flex items-center gap-1 text-ink-500 hover:text-brand-600">
                  <Quote size={13} /> Trích dẫn
                </button>
              )}
              {/* Reply */}
              {user && !thread!.isLocked && !isFirst && (
                <button onClick={() => { setReplyToPost({ id: p.id, authorName: p.author?.displayName || p.author?.username || 'ẩn danh' }); document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-1 text-ink-500 hover:text-brand-600">
                  <Reply size={13} /> Trả lời
                </button>
              )}
              {/* Tag */}
              {user && !thread!.isLocked && p.author && user.id !== p.author.id && (
                <button onClick={() => { const name = p.author?.displayName || p.author?.username || ''; setReply((prev) => (prev || '') + `<p><strong>@${name}</strong> </p>`); document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-1 text-ink-500 hover:text-brand-600">
                  <AtSign size={13} /> Tag
                </button>
              )}
              {/* Edit */}
              {user && p.author && (user.id === p.author.id || isMod) && !thread!.isLocked && editingPostId !== p.id && (
                <button onClick={() => startEdit(p)} className="flex items-center gap-1 text-ink-500 hover:text-blue-600">
                  <Pencil size={13} /> Sửa
                </button>
              )}
            </div>
          </div>
          </div>{/* end flex-1 content */}
        </div>{/* end flex row */}
      </article>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {copyToast && <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-lg bg-ink-900 px-4 py-2 text-sm text-white shadow-card dark:bg-white dark:text-ink-900">{copyToast}</div>}
      <nav className="flex flex-wrap items-center gap-1 text-xs text-ink-400">
        <Link href="/" className="hover:text-brand-600">Trang chủ</Link>
        {thread.category && (
          <>
            <span>/</span>
            <Link href={`/category?id=${(thread as any).category.id}`} className="hover:text-brand-600 text-brand-500">{thread.category.name}</Link>
          </>
        )}
        <span>/</span>
        <span className="truncate max-w-[200px] text-ink-500">{thread.title}</span>
      </nav>
      <div className="card p-5">
        {/* Status badges */}
        {(thread.isPinned || thread.isLocked || (thread as any).isHidden) && (
          <div className="mb-2 flex items-center gap-2 text-sm text-ink-500">
            {thread.isPinned && <Pin size={14} className="text-amber-500" />}
            {thread.isLocked && <Lock size={14} />}
            {(thread as any).isHidden && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">Đã ẩn</span>}
          </div>
        )}
        {/* Title + 3-dot on same line */}
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold sm:text-2xl">{thread.title}</h1>
          {/* 3-dot menu */}
          {(canManage || isMod) && (
            <div className="relative shrink-0" ref={threadMenuRef}>
              <button onClick={() => setThreadMenu((v) => !v)}
                className="mt-0.5 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                <MoreVertical size={18} />
              </button>
              {threadMenu && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-card dark:border-ink-800 dark:bg-ink-900">
                  {canManage && (
                    <>
                      <button onClick={() => { if (firstPost) startEdit(firstPost); setThreadMenu(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                        <Pencil size={14} /> Sửa
                      </button>
                      <button onClick={() => { toggleLock(); setThreadMenu(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                        <Lock size={14} /> {thread.isLocked ? 'Mở bài' : 'Đóng bài'}
                      </button>
                    </>
                  )}
                  {isMod && (
                    <>
                      <div className="my-1 border-t border-ink-200 dark:border-ink-700" />
                      <button onClick={() => { toggleHide(); setThreadMenu(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-600 hover:bg-ink-50 dark:hover:bg-ink-800">
                        {(thread as any).isHidden ? 'Hiện bài' : 'Ẩn bài'}
                      </button>
                      <button onClick={() => { togglePin(); setThreadMenu(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                        <Pin size={14} /> {thread.isPinned ? 'Bỏ ghim' : 'Ghim'}
                      </button>
                      <button onClick={() => { openMove(); setThreadMenu(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                        <FolderInput size={14} /> Chuyển mục
                      </button>
                      <button onClick={() => { openMerge(); setThreadMenu(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                        <Merge size={14} /> Gộp chủ đề
                      </button>
                      <button onClick={() => { setSplitMode(true); setSplitSelected([]); setSplitTitle(''); setThreadMenu(false); }}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-ink-50 dark:hover:bg-ink-800">
                        <Scissors size={14} /> Tách bài
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        {user && (
          <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={toggleBookmark} title="Lưu chủ đề"
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${bookmarked ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
                {bookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />} {bookmarked ? 'Đã lưu' : 'Lưu'}
              </button>
              <button onClick={toggleSub} title="Theo dõi chủ đề"
                className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${subscribed ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
                {subscribed ? <BellRing size={14} /> : <Bell size={14} />} {subscribed ? 'Đang theo dõi' : 'Theo dõi'}
              </button>
              {thread.author && user.id !== (thread.author as any).id && (
                <button onClick={() => { setReportModal({ targetType: 'thread', targetId: thread.id, reportedUserId: (thread.author as any)?.id }); setReportReason(''); setReportType('SPAM'); }}
                  className="flex items-center gap-1 rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-medium text-ink-500 hover:text-red-500 dark:bg-ink-800">
                  <Flag size={14} /> Báo cáo
                </button>
              )}
            </div>
          )}
        {/* Prefix + Tags */}
        {((thread as any).prefix && (thread as any).prefix !== 'NONE') || (thread as any).tags?.length > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {(thread as any).prefixRef ? (
              <span className="chip text-white text-xs" style={{ backgroundColor: (thread as any).prefixRef.color || '#6366f1' }}>{(thread as any).prefixRef.label}</span>
            ) : (thread as any).prefix && (thread as any).prefix !== 'NONE' ? (
              <span className="chip bg-ink-200 text-ink-700 text-xs">{(thread as any).prefix}</span>
            ) : null}
            {((thread as any).tags || []).map((tt: any) => (
              <Link key={tt.tag.id} href={`/tag?slug=${tt.tag.slug}`}
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: tt.tag.color ? tt.tag.color + '22' : '#6366f111', color: tt.tag.color || '#6366f1' }}
              >
                #{tt.tag.name}
              </Link>
            ))}
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
          <span className="flex items-center gap-1"><MessageCircle size={14} /> {thread.replyCount} trả lời</span>
          <span className="flex items-center gap-1"><Eye size={14} /> {thread.viewCount} lượt xem</span>
          <span className="flex items-center gap-1"><ThumbsUp size={14} /> {thread.likeCount}</span>
          {(firstPost || posts.length > 0) && <span className="flex items-center gap-1"><Clock size={14} /> ~{readingTime(firstPost ? [firstPost, ...posts] : posts)} phút đọc</span>}
          {viewing.total > 0 && (
            <span className="flex items-center gap-1 text-emerald-600" title={viewing.users.map((u) => u.displayName || u.username).join(', ')}>
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {viewing.total} đang xem
            </span>
          )}
        </div>
      </div>

      <PollCard threadId={thread.id} />

      <AdBanner position="thread_top" className="h-20 sm:h-24" />

      {/* Bài gốc — luôn hiển thị, không phân trang */}
      {firstPost && renderPostArticle(firstPost, 1, true, firstPost.id === bestAnswerId, 0)}

      {/* ── Chia sẻ bài viết ── */}
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <span className="text-xs font-medium text-ink-500">Chia sẻ:</span>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-[#1877f2] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"><FacebookIcon /> Facebook</a>
        <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(thread.title)}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"><XLogoIcon /> X (Twitter)</a>
        <a href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(thread.title)}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg bg-[#26a5e4] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"><TelegramIcon /> Telegram</a>
        <button type="button" onClick={() => { navigator.clipboard?.writeText(shareUrl).then(() => { setCopyToast('Đã copy liên kết'); setTimeout(() => setCopyToast(''), 1500); }); }}
          className="flex items-center gap-1.5 rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-medium hover:bg-ink-200 dark:bg-ink-800 dark:hover:bg-ink-700"><Link2Icon /> Copy liên kết</button>
      </div>

      {/* ── Bài viết cùng chuyên mục ── */}
      {similarThreads.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
            <h3 className="text-sm font-semibold">Bài viết cùng chuyên mục</h3>
          </div>
          <ul className="divide-y divide-ink-200/70 dark:divide-ink-800">
            {similarThreads.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                <div className="min-w-0 flex-1">
                  <Link href={`/thread?slug=${t.slug}`} className="truncate text-sm font-medium hover:text-brand-600">{t.title}</Link>
                  <p className="mt-0.5 text-xs text-ink-500">{t.author?.displayName || t.author?.username}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-ink-400">
                  <span className="flex items-center gap-1"><MessageCircle size={12} /> {t.replyCount}</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {t.viewCount}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Post pagination top */}
      {postTotalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-2 dark:border-ink-800 dark:bg-ink-900">
          <span className="text-xs text-ink-500">Trang {postPage} / {postTotalPages}</span>
          <div className="flex gap-1">
            {Array.from({ length: postTotalPages }, (_, i) => i + 1).map((pg) => (
              <button key={pg} onClick={() => loadPostPage(pg)} disabled={pg === postPage}
                className={`h-7 w-7 rounded text-xs font-medium ${pg === postPage ? 'bg-brand-600 text-white' : 'hover:bg-ink-100 dark:hover:bg-ink-800'}`}>
                {pg}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {ordered.map((p, idx) => {
          const isBest = p.id === bestAnswerId;
          const depth = (p as any)._depth || 0;
          const postNumber = (postPage - 1) * POST_LIMIT + idx + 2;
          // Show "Bai moi" divider between last-read post and the next unread posts
          const showNewDivider = !!(user && initialLastReadPostId && (idx > 0 ? ordered[idx - 1].id === initialLastReadPostId : initialLastReadPostId === firstPost?.id) && p.id !== initialLastReadPostId);
          return renderPostArticle(p, postNumber, false, isBest, depth, showNewDivider);
        })}
      </div>

      {/* Post pagination bottom */}
      {postTotalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-ink-200 bg-white px-4 py-2 dark:border-ink-800 dark:bg-ink-900">
          <button onClick={() => loadPostPage(Math.max(1, postPage - 1))} disabled={postPage === 1}
            className="rounded px-3 py-1 text-xs font-medium hover:bg-ink-100 disabled:opacity-40 dark:hover:bg-ink-800">
            ← Trang trước
          </button>
          <span className="text-xs text-ink-500">Trang {postPage} / {postTotalPages}</span>
          <button onClick={() => loadPostPage(Math.min(postTotalPages, postPage + 1))} disabled={postPage === postTotalPages}
            className="rounded px-3 py-1 text-xs font-medium hover:bg-ink-100 disabled:opacity-40 dark:hover:bg-ink-800">
            Trang sau →
          </button>
        </div>
      )}

      {commentBox}

      <AdBanner position="thread_bottom" className="h-20 sm:h-24" />

      {/* ── Bài viết mới nhất ── */}
      {latestThreads.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-ink-200/70 px-4 py-3 dark:border-ink-800">
            <h3 className="text-sm font-semibold">Bài viết mới nhất</h3>
          </div>
          <ul className="divide-y divide-ink-200/70 dark:divide-ink-800">
            {latestThreads.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-ink-50/70 dark:hover:bg-ink-800/40">
                <div className="min-w-0 flex-1">
                  <Link href={`/thread?slug=${t.slug}`} className="truncate text-sm font-medium hover:text-brand-600">{t.title}</Link>
                  <p className="mt-0.5 text-xs text-ink-500">{t.author?.displayName || t.author?.username}{t.category ? ` · ${t.category.name}` : ''}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-ink-400">
                  <span className="flex items-center gap-1"><MessageCircle size={12} /> {t.replyCount}</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {t.viewCount}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {/* ── Report Modal ── */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !reportBusy && setReportModal(null)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 font-semibold text-red-600"><Flag size={16} /> Báo cáo nội dung</h3>
            <select className="input mt-3 w-full" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {REPORT_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <textarea className="input mt-2 w-full" rows={3} placeholder="Mô tả vi phạm (tối thiểu 5 ký tự)…" value={reportReason} onChange={(e) => setReportReason(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setReportModal(null)} className="rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Hủy</button>
              <button onClick={submitReport} disabled={reportBusy || reportReason.trim().length < 5} className="rounded-lg bg-red-500 px-4 py-1.5 text-sm text-white disabled:opacity-50">{reportBusy ? 'Đang gửi…' : 'Gửi báo cáo'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit History Modal ── */}
      {historyPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setHistoryPostId(null)}>
          <div className="card w-full max-w-lg max-h-[80vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 font-semibold"><History size={16} /> Lịch sử chỉnh sửa</h3>
            {historyLoading ? <p className="mt-3 text-center text-sm text-ink-500">Đang tải…</p> : historyItems.length === 0 ? (
              <p className="mt-3 text-center text-sm text-ink-500">Chưa có lịch sử chỉnh sửa.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {historyItems.map((h) => (
                  <div key={h.id} className="rounded-lg border border-ink-200 p-3 dark:border-ink-800">
                    <div className="flex items-center gap-2 text-xs text-ink-500">
                      <span className="font-medium text-ink-700 dark:text-ink-300">{h.editor?.displayName || h.editor?.username}</span>
                      <span>·</span>
                      <span>{new Date(h.createdAt).toLocaleString('vi')}</span>
                      {h.editReason && <span className="ml-auto italic">{h.editReason}</span>}
                    </div>
                    <div className="prose prose-xs mt-2 max-w-none dark:prose-invert line-clamp-4 text-xs opacity-70" onClick={interceptExternalLink} dangerouslySetInnerHTML={{ __html: h.oldContentRaw?.slice(0, 500) || '' }} />
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setHistoryPostId(null)} className="mt-4 rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Đóng</button>
          </div>
        </div>
      )}

      {/* ── Warn User Modal ── */}
      {warnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !warnBusy && setWarnModal(null)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 font-semibold text-amber-600"><AlertTriangle size={16} /> Cảnh cáo người dùng</h3>
            <p className="mt-1 text-sm text-ink-500">Cảnh cáo <strong>{warnModal.username}</strong></p>
            <textarea className="input mt-3 w-full" rows={3} placeholder="Lý do cảnh cáo…" value={warnReason} onChange={(e) => setWarnReason(e.target.value)} />
            <label className="mt-2 block text-xs text-ink-500">Điểm cảnh cáo (≥10 tự động ban 7 ngày)
              <input type="number" min={1} max={10} className="input mt-1 w-24 ml-2" value={warnPoints} onChange={(e) => setWarnPoints(Number(e.target.value))} />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setWarnModal(null)} className="rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Hủy</button>
              <button onClick={submitWarn} disabled={warnBusy || !warnReason.trim()} className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm text-white disabled:opacity-50">{warnBusy ? 'Đang gửi…' : 'Gửi cảnh cáo'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reply Ban Modal ── */}
      {replyBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !replyBanBusy && setReplyBanModal(null)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 font-semibold text-orange-600"><UserX size={16} /> Cấm trả lời trong chủ đề</h3>
            <p className="mt-1 text-sm text-ink-500">Cấm <strong>{replyBanModal.username}</strong> trả lời trong chủ đề này</p>
            <input className="input mt-3 w-full" placeholder="Lý do (tuỳ chọn)…" value={replyBanReason} onChange={(e) => setReplyBanReason(e.target.value)} />
            <label className="mt-2 block text-xs text-ink-500">Hết hạn (để trống = vĩnh viễn)
              <input type="datetime-local" className="input mt-1 w-full" value={replyBanExpiry} onChange={(e) => setReplyBanExpiry(e.target.value)} />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setReplyBanModal(null)} className="rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Hủy</button>
              <button onClick={submitReplyBan} disabled={replyBanBusy} className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm text-white disabled:opacity-50">{replyBanBusy ? 'Đang cấm…' : 'Cấm trả lời'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Move Post Modal ── */}
      {movePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !movePostBusy && setMovePostModal(null)}>
          <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="flex items-center gap-2 font-semibold"><Shuffle size={16} /> Chuyển bài viết sang chủ đề khác</h3>
            <input autoFocus className="input mt-3 w-full" placeholder="Tìm chủ đề đích…" value={movePostTarget} onChange={(e) => searchMovePostTargets(e.target.value)} />
            <div className="mt-2 max-h-60 space-y-1 overflow-y-auto">
              {movePostResults.map((t) => (
                <button key={t.id} onClick={() => confirmMovePost(t.id)} disabled={movePostBusy}
                  className="block w-full truncate rounded-lg border border-ink-200 px-3 py-2 text-left text-sm hover:bg-ink-50 disabled:opacity-50 dark:border-ink-800 dark:hover:bg-ink-800/50">
                  {t.title}
                </button>
              ))}
              {movePostTarget.trim().length >= 2 && movePostResults.length === 0 && <p className="py-2 text-center text-xs text-ink-500">Không tìm thấy chủ đề.</p>}
            </div>
            <div className="mt-3 flex justify-end">
              <button onClick={() => setMovePostModal(null)} className="rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Hủy</button>
            </div>
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
