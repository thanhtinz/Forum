'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Heart, Star, SkipBack, SkipForward, ArrowLeft, Search, ArrowDownUp, Send, Trash2, Play, MoreHorizontal, Server, X, Smile } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import { EmojiStickerPicker, isStickerContent } from '@/components/EmojiStickerPicker';

const ytId = (u: string) => u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1] || null;
const proxy = (u: string, ref?: string | null) =>
  `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/anime/hls?u=${encodeURIComponent(u)}${ref ? `&r=${encodeURIComponent(ref)}` : ''}`;

// Emoji động (Google Noto Animated Emoji) – cp = mã codepoint
const animEmoji = (cp: string) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${cp}/512.gif`;
const RATINGS = [
  { v: 5, label: 'Đỉnh nóc', cp: '1f60d' }, // 😍
  { v: 4, label: 'Hay ho', cp: '1f618' },   // 😘
  { v: 3, label: 'Tạm ổn', cp: '1f642' },   // 🙂
  { v: 2, label: 'Nhạt nhòa', cp: '1f641' },// 🙁
  { v: 1, label: 'Thảm họa', cp: '1f92e' }, // 🤮
];

function PlayerError(_props: { msg?: string }) {
  return (
    <div className="grid h-full place-items-center p-4 text-center text-white/80">
      <div>
        <p className="text-sm font-medium">Video không thể phát ngay lúc này</p>
        <p className="mt-1 text-xs text-white/50">Vui lòng đổi <b>server</b> bên dưới.</p>
      </div>
    </div>
  );
}

interface PlayerProps { url: string; referer?: string | null; introEnd?: number | null; skipIntro: boolean; autoNext: boolean; onEnded: () => void }

// Player chính (ArtPlayer) cho nguồn m3u8/mp4 — thử trực tiếp trước, fallback sang proxy nếu lỗi CORS/IP-block.
function VideoPlayer({ url, referer, isHls, introEnd, skipIntro, autoNext, onEnded }: PlayerProps & { isHls: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  // Thử phát TRỰC TIẾP trước cho cả HLS lẫn mp4 (tránh bị CDN chặn IP server);
  // fallback sang proxy nếu lỗi CORS hoặc CDN chặn.
  const [viaProxy, setViaProxy] = useState(false);
  const viaProxyRef = useRef(viaProxy); viaProxyRef.current = viaProxy;
  const src = viaProxy ? proxy(url, referer) : url;
  // Khi đổi tập/đổi server: reset về direct và xoá lỗi cũ.
  useEffect(() => { setViaProxy(false); setError(''); }, [url, isHls]);
  // Giữ giá trị mới nhất mà không tạo lại player
  const introRef = useRef({ introEnd, skipIntro }); introRef.current = { introEnd, skipIntro };
  const nextRef = useRef({ autoNext, onEnded }); nextRef.current = { autoNext, onEnded };
  const skippedRef = useRef(false); // chỉ nhảy intro MỘT lần ở đầu tập

  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    setError(''); skippedRef.current = false;
    let art: any; let cancelled = false; let nativeEndedHandler: (() => void) | null = null;
    Promise.all([import('artplayer'), isHls ? import('hls.js') : Promise.resolve(null)]).then(([artMod, hlsMod]) => {
      if (cancelled) return;
      const Artplayer = artMod.default;
      const Hls = hlsMod?.default;
      art = new Artplayer({
        container: el,
        url: src,
        type: isHls ? 'm3u8' : 'mp4',
        autoplay: true,
        setting: true,
        playbackRate: true,
        aspectRatio: true,
        fullscreen: true,
        fullscreenWeb: true,
        pip: true,
        miniProgressBar: true,
        autoOrientation: true,
        theme: '#6366f1',
        customType: isHls
          ? {
              m3u8: (video: HTMLVideoElement, u: string, instance: any) => {
                if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = u; return; }
                if (Hls && Hls.isSupported()) {
                  const hls = new Hls({ maxBufferLength: 30 });
                  hls.loadSource(u); hls.attachMedia(video);
                  let recover = 0;
                  hls.on(Hls.Events.ERROR, (_e: any, data: any) => {
                    if (!data?.fatal) return;
                    // Nếu đang phát trực tiếp mà lỗi network (CORS/IP-block) → fallback sang proxy
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !viaProxyRef.current) {
                      hls.destroy();
                      setViaProxy(true);
                      return;
                    }
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recover < 3) { recover++; hls.startLoad(); return; }
                    if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recover < 3) { recover++; hls.recoverMediaError(); return; }
                    setError(`Lỗi tải luồng (${data.type || 'network'}).`);
                  });
                  instance.hls = hls;
                  instance.on('destroy', () => hls.destroy());
                } else { setError('Trình duyệt không hỗ trợ HLS.'); }
              },
            }
          : {
              // Set referrerPolicy TRƯỚC khi gán src để browser không gửi Referer (bypass hotlink)
              mp4: (video: HTMLVideoElement, u: string) => {
                (video as any).referrerPolicy = 'no-referrer';
                video.src = u;
              },
            },
      });
      art.on('video:timeupdate', () => {
        const { introEnd, skipIntro } = introRef.current;
        if (skipIntro && introEnd && !skippedRef.current && art.currentTime < introEnd) {
          skippedRef.current = true;
          art.currentTime = introEnd;
        }
      });
      // Dùng native ended trực tiếp trên video element (đáng tin hơn ArtPlayer event với HLS/proxy)
      let endedFired = false;
      nativeEndedHandler = () => {
        if (endedFired) return;
        endedFired = true;
        if (nextRef.current.autoNext) nextRef.current.onEnded();
      };
      art.on('video:ended', nativeEndedHandler);
      if (art.video) art.video.addEventListener('ended', nativeEndedHandler);
      art.on('error', () => {
        if (!isHls && !viaProxyRef.current) { setViaProxy(true); return; }
        setError('Trình duyệt không tải được (CORS/403).');
      });
    }).catch(() => setError('Không tải được trình phát.'));
    return () => { cancelled = true; if (nativeEndedHandler && art?.video) art.video.removeEventListener('ended', nativeEndedHandler); if (art?.destroy) art.destroy(false); };
  }, [src, isHls]);

  if (error) return <PlayerError msg={error} />;
  return <div ref={boxRef} className="h-full w-full" />;
}

function Player(props: PlayerProps) {
  const { url } = props;
  if (!url) return <div className="grid h-full place-items-center text-ink-400"><div className="text-center"><Play size={40} className="mx-auto opacity-50" /><p className="mt-2 text-sm">Tập này chưa có link xem</p></div></div>;
  if (/\.m3u8(\?|$)/i.test(url)) return <VideoPlayer {...props} isHls />;
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return <VideoPlayer {...props} isHls={false} />;
  // YouTube + mọi nguồn iframe khác đều đi qua IframePlayer để bắt postMessage ended
  return <IframePlayer {...props} url={url} />;
}

function IframePlayer({ url, autoNext, onEnded }: PlayerProps) {
  const nextRef = useRef({ autoNext, onEnded });
  nextRef.current = { autoNext, onEnded };

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      try {
        const raw = e.data;
        if (!raw) return;

        // Parse chuỗi JSON nếu cần
        let d: any = raw;
        if (typeof raw === 'string') {
          try { d = JSON.parse(raw); } catch { d = raw; }
        }

        const str = typeof d === 'string' ? d.toLowerCase() : '';

        // YouTube IFrame API: state=0 là ended
        if (d?.event === 'onStateChange' && (d?.info === 0 || d?.info === '0')) {
          if (nextRef.current.autoNext) nextRef.current.onEnded();
          return;
        }

        // Các player phổ biến (VidStream, MyCloud, Filemoon, Streamtape…)
        const isEnded =
          str === 'ended' ||
          d?.event === 'ended'       || d?.type === 'ended'   || d?.action === 'ended' ||
          d?.status === 'ended'      || d?.state === 'ended'  ||
          d?.event === 'video:ended' || d?.event === 'complete' ||
          d?.player === 'ended'      || d?.message === 'ended' ||
          // JSON nhúng trong chuỗi
          (str.includes('"ended"') || str.includes('"complete"') || str.includes('"finished"'));

        if (isEnded && nextRef.current.autoNext) nextRef.current.onEnded();
      } catch {}
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const yt = ytId(url);
  if (yt) {
    // enablejsapi=1 để YouTube gửi postMessage state changes
    return <iframe src={`https://www.youtube.com/embed/${yt}?autoplay=1&enablejsapi=1`} className="h-full w-full" allowFullScreen title="Player" />;
  }

  return <iframe src={url} className="h-full w-full" allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
    sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-pointer-lock allow-orientation-lock"
    allowFullScreen title="Player" />;
}

interface CommentT { id: string; content: string; createdAt: string; authorId: string; parentId?: string | null; author: { id: string; username: string; displayName?: string | null; avatar?: string | null }; replies?: CommentT[] }
interface ServerT { id: string; name: string; videoUrl: string; referer?: string | null; introEnd?: number | null }

function Watch() {
  const id = useSearchParams().get('ep') || '';
  const router = useRouter();
  const { user } = useAuth();
  const [ep, setEp] = useState<any>(null);
  const [err, setErr] = useState('');
  const [entry, setEntry] = useState<{ favorite: boolean; score: number | null } | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [serverIdx, setServerIdx] = useState(0);
  // tuỳ chọn (lưu localStorage)
  const [autoNext, setAutoNext] = useState(true);
  const [skipIntro, setSkipIntro] = useState(false);
  // chọn tập
  const [q, setQ] = useState('');
  const [asc, setAsc] = useState(false);
  // bình luận
  const [comments, setComments] = useState<CommentT[]>([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [picker, setPicker] = useState(false);
  // reply
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyPosting, setReplyPosting] = useState(false);
  // countdown tự chuyển tập (như Netflix)
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const [nextDismissed, setNextDismissed] = useState(false);
  // Ref lưu timer ID để cancel chính xác kể cả khi React re-render
  const nextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAutoNext(localStorage.getItem('anime_autonext') !== '0');
    setSkipIntro(localStorage.getItem('anime_skipintro') === '1');
  }, []);
  useEffect(() => {
    if (!id) return;
    setErr(''); setServerIdx(0);
    api.get<any>(`/anime/episode/${id}`).then((e) => { setEp(e); setComments(e.comments || []); window.scrollTo(0, 0); }).catch((e) => setErr(e.message));
  }, [id]);
  useEffect(() => {
    if (!user || !ep?.media?.id) { setEntry(null); return; }
    api.get<any>(`/anime/me/entry/${ep.media.id}`).then((en) => setEntry(en ? { favorite: en.favorite, score: en.score } : { favorite: false, score: null })).catch(() => {});
  }, [user, ep?.media?.id]);

  function toggleAutoNext() { setAutoNext((v) => { localStorage.setItem('anime_autonext', v ? '0' : '1'); return !v; }); }
  function toggleSkipIntro() { setSkipIntro((v) => { localStorage.setItem('anime_skipintro', v ? '0' : '1'); return !v; }); }

  // Countdown timer: dùng ref để tránh bị React cleanup cancel nhầm
  useEffect(() => {
    // Cancel timer cũ nếu có
    if (nextTimerRef.current) { clearTimeout(nextTimerRef.current); nextTimerRef.current = null; }
    setNextCountdown(null);
    setNextDismissed(false);
    if (!ep?.id || !ep?.next) return;
    let triggerSec: number;
    if (ep.showNextAt != null && ep.showNextAt > 0) {
      triggerSec = ep.showNextAt;
    } else if (ep.duration) {
      triggerSec = Math.max(ep.duration * 60 - 90, 5);
    } else {
      triggerSec = 5;
    }
    nextTimerRef.current = setTimeout(() => { nextTimerRef.current = null; setNextCountdown(15); }, triggerSec * 1000);
  }, [ep?.id, serverIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dọn dẹp khi unmount
  useEffect(() => () => { if (nextTimerRef.current) clearTimeout(nextTimerRef.current); }, []);

  // Tick đếm ngược — dependency array [nextCountdown] để không bị cancel mỗi render
  useEffect(() => {
    if (nextCountdown === null) return;
    if (nextCountdown <= 0) {
      if (autoNext && ep?.next) goNext();
      setNextCountdown(null);
      return;
    }
    const t = setTimeout(() => setNextCountdown((n) => (n ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [nextCountdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabGroups = useMemo(() => {
    const allEps: any[] = ep?.episodes || [];
    const KIND_MAP: Record<string, string> = { movie: 'Movie', ova: 'OVA', special: 'Special', recap: 'Recap' };
    const groups: Array<{ key: string; label: string; kind: 'part' | 'single'; items?: any[]; epId?: string }> = [];
    const partMap = new Map<number, any[]>();
    const singles: any[] = [];
    for (const e of allEps) {
      if (!e.kind || e.kind === 'episode') {
        const p = e.part ?? 1;
        if (!partMap.has(p)) partMap.set(p, []);
        partMap.get(p)!.push(e);
      } else { singles.push(e); }
    }
    [...partMap.entries()].sort((a, b) => a[0] - b[0]).forEach(([part, items]) => {
      groups.push({ key: `part-${part}`, label: `Phần ${part}`, kind: 'part', items });
    });
    const kindCount: Record<string, number> = {};
    for (const e of singles) kindCount[e.kind] = (kindCount[e.kind] || 0) + 1;
    const kindSeen: Record<string, number> = {};
    for (const e of singles) {
      const seen = (kindSeen[e.kind] = (kindSeen[e.kind] || 0) + 1);
      const base = KIND_MAP[e.kind] || e.kind;
      groups.push({ key: `ep-${e.id}`, label: kindCount[e.kind] > 1 ? `${base} ${seen}` : base, kind: 'single', epId: e.id });
    }
    return groups;
  }, [ep?.episodes]);

  const currentTabKey = useMemo(() => {
    if (!ep) return tabGroups[0]?.key ?? '';
    if (!ep.kind || ep.kind === 'episode') return `part-${ep.part ?? 1}`;
    return `ep-${ep.id}`;
  }, [ep, tabGroups]);

  const [activeTab, setActiveTab] = useState('');
  useEffect(() => { setActiveTab(currentTabKey); }, [currentTabKey]);

  const showTabs = tabGroups.length > 1;
  const activeGroup = tabGroups.find((g) => g.key === activeTab) ?? tabGroups[0];

  const tabEpisodes = useMemo(() => {
    if (activeGroup?.kind !== 'part') return [];
    let list = [...(activeGroup.items || [])];
    list.sort((a, b) => asc ? a.number - b.number : b.number - a.number);
    if (q.trim()) list = list.filter((e: any) => String(e.number).includes(q.trim()));
    return list;
  }, [activeGroup, asc, q]);

  async function saveEntry(patch: { favorite?: boolean; score?: number | null }) {
    if (!user) { router.push('/login'); return; }
    const next = { favorite: entry?.favorite ?? false, score: entry?.score ?? null, ...patch };
    setEntry(next);
    try { await api.put(`/anime/me/entry/${ep.media.id}`, patch); } catch {}
  }
  function goNext() { if (ep?.next) router.push(`/anime/watch?ep=${ep.next.id}`); }
  function buildCommentTree(flat: CommentT[]): CommentT[] {
    const map = new Map<string, CommentT & { replies: CommentT[] }>();
    const roots: (CommentT & { replies: CommentT[] })[] = [];
    for (const c of flat) map.set(c.id, { ...c, replies: [] });
    for (const c of flat) {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.replies.push(node);
      else roots.push(node);
    }
    return roots;
  }
  function getDescendantIds(cid: string, flat: CommentT[]): string[] {
    const children = flat.filter((c) => c.parentId === cid);
    return [cid, ...children.flatMap((c) => getDescendantIds(c.id, flat))];
  }

  async function postComment(content: string, parentId?: string | null) {
    if (!content.trim()) return;
    if (!user) { router.push('/login'); return; }
    if (parentId) { setReplyPosting(true); } else { setPosting(true); }
    try {
      const c = await api.post<CommentT>(`/anime/episode/${id}/comments`, { content, parentId: parentId || undefined });
      setComments((cs) => [...cs, c]);
      if (parentId) { setReplyTexts((t) => ({ ...t, [parentId]: '' })); setReplyingToId(null); }
      else setText('');
    }
    catch (e: any) { setErr(e.message); }
    finally { setPosting(false); setReplyPosting(false); }
  }
  function submitComment(e: React.FormEvent) { e.preventDefault(); postComment(text); }
  async function delComment(cid: string) {
    if (!confirm('Xoá bình luận?')) return;
    try {
      await api.del(`/anime/comment/${cid}`);
      const toRemove = new Set(getDescendantIds(cid, comments));
      setComments((cs) => cs.filter((c) => !toRemove.has(c.id)));
    } catch {}
  }

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!ep) return <p className="p-10 text-center text-ink-500">Đang tải…</p>;
  const isMod = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const servers: ServerT[] = ep.servers || [];
  const cur = servers[serverIdx] || servers[0] || null;
  const curUrl = cur?.videoUrl || '';

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <a href={`/anime/detail?slug=${ep.media.slug}`} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> {ep.media.title}</a>

      {/* Player */}
      <div className="overflow-hidden rounded-xl bg-black shadow-card">
        <div className="aspect-video w-full">
          <Player url={curUrl} referer={cur?.referer} introEnd={cur?.introEnd} skipIntro={skipIntro} autoNext={autoNext} onEnded={goNext} />
        </div>
        {/* Banner tập tiếp theo — hiện khi timer kích hoạt (showNextAt), ẩn khi bấm X */}
        {nextCountdown !== null && ep?.next && !nextDismissed && (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-ink-800 px-4 py-2.5 text-white">
            <div className="min-w-0">
              <span className="text-[10px] text-white/50">Tập tiếp theo · </span>
              <span className="text-sm font-semibold">Tập {ep.next.number}{ep.next.title ? ` — ${ep.next.title}` : ''}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={goNext} className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-medium hover:bg-brand-500">Xem ngay</button>
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-brand-500 text-sm font-bold tabular-nums">{nextCountdown}</div>
              <button onClick={() => { setNextDismissed(true); setNextCountdown(null); if (nextTimerRef.current) { clearTimeout(nextTimerRef.current); nextTimerRef.current = null; } }} className="text-white/40 hover:text-white"><X size={14} /></button>
            </div>
          </div>
        )}
        {/* Thanh hành động */}
        <div className="grid grid-cols-5 divide-x divide-white/10 border-t border-white/10 bg-ink-900 text-white">
          <button onClick={() => saveEntry({ favorite: !entry?.favorite })} className="flex flex-col items-center gap-0.5 py-2 text-[10px] hover:bg-white/5">
            <Heart size={17} className={entry?.favorite ? 'fill-rose-500 text-rose-500' : ''} /> Theo dõi
          </button>
          <button onClick={() => setRateOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] hover:bg-white/5">
            <Star size={17} className={entry?.score ? 'fill-amber-400 text-amber-400' : ''} /> {entry?.score ? `Đã chấm ${entry.score}` : 'Đánh giá'}
          </button>
          <a href={ep.prev ? `/anime/watch?ep=${ep.prev.id}` : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${ep.prev ? 'hover:bg-white/5' : 'opacity-40'}`}><SkipBack size={17} /> Trước</a>
          <a href={ep.next ? `/anime/watch?ep=${ep.next.id}` : undefined} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] ${ep.next ? 'hover:bg-white/5' : 'opacity-40'}`}><SkipForward size={17} /> Tiếp</a>
          <button onClick={() => setMoreOpen((o) => !o)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] hover:bg-white/5"><MoreHorizontal size={17} /> Khác</button>
        </div>
        {/* Panel "Khác" */}
        {moreOpen && (
          <div className="space-y-2 border-t border-white/10 bg-ink-900 p-4 text-white">
            <label className="flex cursor-pointer items-center justify-between text-sm">
              <span>Tự chuyển tập tiếp theo</span>
              <span onClick={toggleAutoNext} className={`relative h-6 w-11 rounded-full transition ${autoNext ? 'bg-brand-500' : 'bg-white/20'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${autoNext ? 'left-[22px]' : 'left-0.5'}`} /></span>
            </label>
            <label className="flex cursor-pointer items-center justify-between text-sm">
              <span>Bỏ qua đoạn đầu {cur?.introEnd ? `(0s–${cur.introEnd}s)` : '(server này chưa đặt)'}</span>
              <span onClick={toggleSkipIntro} className={`relative h-6 w-11 rounded-full transition ${skipIntro ? 'bg-brand-500' : 'bg-white/20'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${skipIntro ? 'left-[22px]' : 'left-0.5'}`} /></span>
            </label>

          </div>
        )}
      </div>

      <h1 className="text-lg font-bold">
        {ep.kind && ep.kind !== 'episode'
          ? ({ movie: 'Movie', ova: 'OVA', special: 'Special', recap: 'Recap' }[ep.kind as string] ?? ep.kind)
          : `Tập ${ep.number}`}
        {ep.title ? `: ${ep.title}` : ''}
      </h1>

      {/* Chọn tập / phần / movie */}
      {ep.episodes?.length > 0 && (
        <div className="card space-y-3 p-4">
          {/* Tab bar */}
          {showTabs && (
            <div className="flex flex-wrap gap-1.5">
              {tabGroups.map((g) =>
                g.kind === 'part' ? (
                  <button key={g.key} onClick={() => setActiveTab(g.key)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${activeTab === g.key ? 'bg-brand-600 text-white shadow' : 'bg-ink-100 dark:bg-ink-800'}`}>
                    {g.label}
                  </button>
                ) : (
                  <a key={g.key} href={`/anime/watch?ep=${g.epId}`}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${currentTabKey === g.key ? 'bg-amber-500 text-white shadow' : 'bg-ink-100 dark:bg-ink-800'}`}>
                    {g.label}
                  </a>
                )
              )}
            </div>
          )}

          {/* Phần tab: danh sách tập + tìm kiếm */}
          {activeGroup?.kind === 'part' && (
            <>
              <div className="flex items-center gap-2">
                {!showTabs && <h2 className="flex items-center gap-1.5 font-semibold"><Search size={16} /> Chọn tập</h2>}
                <button onClick={() => setAsc((a) => !a)} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-ink-100 px-2.5 py-1 text-xs dark:bg-ink-800"><ArrowDownUp size={13} /> {asc ? 'Tăng dần' : 'Giảm dần'}</button>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-ink-200 px-2 dark:border-ink-700">
                <Search size={15} className="text-ink-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập số tập…" className="w-full bg-transparent py-2 text-sm outline-none" />
              </div>
              <div className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto">
                {tabEpisodes.map((e: any) => (
                  <a key={e.id} href={`/anime/watch?ep=${e.id}`}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${e.id === id ? 'bg-amber-500 text-white' : 'bg-ink-100 hover:bg-amber-500 hover:text-white dark:bg-ink-800 dark:hover:bg-amber-500'}`}>
                    <Play size={11} className="shrink-0" /><span className="truncate">Tập {e.number}</span>
                  </a>
                ))}
              </div>
            </>
          )}

          {/* Movie / OVA / Special tab: server switcher nếu đang xem, gợi ý nếu chưa */}
          {activeGroup?.kind === 'single' && (
            activeGroup.epId === id
              ? servers.length > 1
                ? <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-ink-500"><Server size={15} /> Đổi server:</span>
                    {servers.map((s, i) => (
                      <button key={s.id} onClick={() => setServerIdx(i)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${i === serverIdx ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                : <p className="py-1 text-sm text-ink-500">Đang xem.</p>
              : <p className="py-1 text-sm text-ink-500">Nhấn tab để xem ngay.</p>
          )}
        </div>
      )}

      {/* Đổi server (chỉ hiện cho tập thường, khi không dùng tab đơn) */}
      {(!showTabs || activeGroup?.kind === 'part') && servers.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-ink-500"><Server size={15} /> Đổi server:</span>
          {servers.map((s, i) => (
            <button key={s.id} onClick={() => setServerIdx(i)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${i === serverIdx ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{s.name}</button>
          ))}
        </div>
      )}

      {/* Bình luận tập này */}
      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Bình luận {ep.kind && ep.kind !== 'episode' ? ({ movie: 'Movie', ova: 'OVA', special: 'Special', recap: 'Recap' }[ep.kind as string] ?? ep.kind) : `tập ${ep.number}`} ({comments.length})</h2>
        {user ? (
          <form onSubmit={submitComment} className="relative mb-4 flex items-start gap-2">
            <Avatar user={user} size={32} />
            <div className="relative flex-1">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Viết bình luận về tập này…" className="input w-full resize-none pr-9" />
              <button type="button" onClick={() => setPicker((v) => !v)} className={`absolute right-2 top-2 rounded p-1 hover:bg-ink-100 dark:hover:bg-ink-800 ${picker ? 'text-brand-600' : 'text-ink-400'}`} title="Emoji / Sticker"><Smile size={18} /></button>
              {picker && (
                <EmojiStickerPicker
                  onEmoji={(e) => setText((t) => t + e)}
                  onSticker={(url) => { setPicker(false); postComment(url); }}
                  onClose={() => setPicker(false)}
                />
              )}
            </div>
            <button type="submit" disabled={posting || !text.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"><Send size={18} /></button>
          </form>
        ) : (
          <p className="mb-4 text-sm text-ink-500"><a href="/login" className="text-brand-600 hover:underline">Đăng nhập</a> để bình luận.</p>
        )}
        <div className="space-y-3">
          {comments.length === 0 && <p className="text-sm text-ink-500">Chưa có bình luận nào.</p>}
          {buildCommentTree(comments).map((c) => (
            <CommentNode key={c.id} c={c} depth={0}
              user={user} isMod={isMod}
              replyingToId={replyingToId} setReplyingToId={setReplyingToId}
              replyTexts={replyTexts} setReplyTexts={setReplyTexts}
              replyPosting={replyPosting}
              onDel={delComment} onReply={postComment}
            />
          ))}
        </div>
      </div>

      {/* Modal đánh giá */}
      {rateOpen && (
        <RateModal
          title={ep.media.titleEnglish || ep.media.title}
          avg={ep.media.avgScore} count={ep.media.ratingCount} current={entry?.score ?? null}
          onClose={() => setRateOpen(false)}
          onSubmit={(v) => { saveEntry({ score: v }); setRateOpen(false); }}
        />
      )}
    </div>
  );
}

interface CommentNodeProps {
  c: CommentT; depth: number;
  user: any; isMod: boolean;
  replyingToId: string | null; setReplyingToId: (id: string | null) => void;
  replyTexts: Record<string, string>; setReplyTexts: (fn: (t: Record<string, string>) => Record<string, string>) => void;
  replyPosting: boolean;
  onDel: (id: string) => void; onReply: (content: string, parentId: string) => void;
}
function CommentNode({ c, depth, user, isMod, replyingToId, setReplyingToId, replyTexts, setReplyTexts, replyPosting, onDel, onReply }: CommentNodeProps) {
  const MAX_INDENT = 4;
  const indent = Math.min(depth, MAX_INDENT);
  return (
    <div className={indent > 0 ? 'ml-6 border-l-2 border-ink-200 pl-3 dark:border-ink-700' : ''}>
      <div className="flex items-start gap-2">
        <Avatar user={c.author} size={depth > 0 ? 26 : 32} />
        <div className="min-w-0 flex-1 rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-ink-700 dark:text-ink-200">{c.author.displayName || c.author.username}</span>
            <span className="text-[11px] text-ink-400">{new Date(c.createdAt).toLocaleDateString('vi')}</span>
            {user && (c.authorId === user.id || isMod) && <button onClick={() => onDel(c.id)} className="ml-auto text-ink-400 hover:text-red-500"><Trash2 size={13} /></button>}
          </div>
          {isStickerContent(c.content)
            ? <img src={c.content.trim()} alt="sticker" className="mt-1 h-24 w-24 object-contain" />
            : <p className="whitespace-pre-line break-words text-sm text-ink-700 dark:text-ink-200">{c.content}</p>}
        </div>
      </div>
      {user && (
        <div className="ml-9 mt-1">
          {replyingToId !== c.id && (
            <button onClick={() => setReplyingToId(c.id)} className="text-[11px] text-ink-400 hover:text-brand-600">Trả lời</button>
          )}
          {replyingToId === c.id && (
            <div className="mt-1.5 flex items-start gap-2">
              <Avatar user={user} size={24} />
              <div className="flex-1">
                <textarea
                  autoFocus rows={2}
                  value={replyTexts[c.id] || ''}
                  onChange={(e) => setReplyTexts((t) => ({ ...t, [c.id]: e.target.value }))}
                  placeholder={`Trả lời @${c.author.displayName || c.author.username}…`}
                  className="input w-full resize-none text-sm"
                />
                <div className="mt-1 flex gap-2">
                  <button disabled={replyPosting || !(replyTexts[c.id] || '').trim()} onClick={() => onReply(replyTexts[c.id] || '', c.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1 text-xs text-white hover:bg-brand-700 disabled:opacity-50">
                    <Send size={12} /> Gửi
                  </button>
                  <button onClick={() => setReplyingToId(null)} className="rounded-lg bg-ink-100 px-3 py-1 text-xs dark:bg-ink-800">Huỷ</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {(c.replies || []).length > 0 && (
        <div className="mt-2 space-y-2">
          {(c.replies || []).map((r) => (
            <CommentNode key={r.id} c={r} depth={depth + 1}
              user={user} isMod={isMod}
              replyingToId={replyingToId} setReplyingToId={setReplyingToId}
              replyTexts={replyTexts} setReplyTexts={setReplyTexts}
              replyPosting={replyPosting}
              onDel={onDel} onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RateModal({ title, avg, count, current, onClose, onSubmit }: { title: string; avg: number; count: number; current: number | null; onClose: () => void; onSubmit: (v: number) => void }) {
  const [sel, setSel] = useState<number | null>(current);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-ink-900 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-orange-400 p-6 text-center">
          <button onClick={onClose} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/20 hover:bg-white/30"><X size={16} /></button>
          <h3 className="text-xl font-bold">{title}</h3>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-black/20 px-4 py-1.5 text-sm font-medium"><Star size={16} className="fill-amber-300 text-amber-300" /> {avg ? avg.toFixed(2) : '0'}/5 ({count} lượt đánh giá)</span>
        </div>
        <div className="p-5">
          <p className="mb-4 text-center text-lg">Bạn đánh giá phim này thế nào?</p>
          <div className="grid grid-cols-2 gap-3">
            {RATINGS.map((r) => (
              <button key={r.v} onClick={() => setSel(r.v)} className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${sel === r.v ? 'border-brand-400 bg-white/10' : 'border-transparent bg-white/5 hover:bg-white/10'}`}>
                <img src={animEmoji(r.cp)} alt={r.label} className="h-9 w-9 shrink-0" loading="lazy" /> <span className="font-medium">{r.label}</span>
              </button>
            ))}
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => sel && onSubmit(sel)} disabled={!sel} className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-400 px-6 py-2.5 font-semibold disabled:opacity-50">Gửi đánh giá</button>
            <button onClick={onClose} className="rounded-xl bg-white/10 px-6 py-2.5 font-medium hover:bg-white/20">Đóng</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return <Suspense fallback={<p className="p-10 text-center text-ink-500">Đang tải…</p>}><Watch /></Suspense>;
}
