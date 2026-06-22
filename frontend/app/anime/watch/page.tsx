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

const RATINGS = [
  { v: 5, label: 'Đỉnh nóc', emoji: '😍' },
  { v: 4, label: 'Hay ho', emoji: '😙' },
  { v: 3, label: 'Tạm ổn', emoji: '🙂' },
  { v: 2, label: 'Nhạt nhòa', emoji: '🙁' },
  { v: 1, label: 'Thảm họa', emoji: '🤮' },
];

function PlayerError({ msg }: { msg: string }) {
  return (
    <div className="grid h-full place-items-center p-4 text-center text-white/80">
      <div>
        <p className="text-sm font-medium">Không phát được nguồn này</p>
        <p className="mt-1 text-xs text-white/50">{msg}</p>
        <p className="mt-2 text-xs text-white/50">Thử đổi <b>server</b> bên dưới, hoặc admin đặt <b>Referer</b> cho tập.</p>
      </div>
    </div>
  );
}

interface PlayerProps { url: string; referer?: string | null; introStart?: number | null; introEnd?: number | null; skipIntro: boolean; autoNext: boolean; onEnded: () => void }

function VideoPlayer({ url, referer, isHls, introStart, introEnd, skipIntro, autoNext, onEnded }: PlayerProps & { isHls: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  const src = proxy(url, referer);
  useEffect(() => {
    const video = ref.current; if (!video) return;
    setError('');
    let hls: any; let cancelled = false;
    if (isHls && !video.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled) return;
        if (Hls.isSupported()) {
          hls = new Hls({ maxBufferLength: 30 });
          hls.loadSource(src); hls.attachMedia(video);
          let recover = 0;
          hls.on(Hls.Events.ERROR, (_e: any, data: any) => {
            if (!data?.fatal) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && recover < 3) { recover++; hls.startLoad(); return; }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recover < 3) { recover++; hls.recoverMediaError(); return; }
            setError(`Lỗi tải luồng (${data.type || 'network'}).`);
          });
        } else { video.src = src; }
      });
    } else { video.src = src; }
    return () => { cancelled = true; if (hls) hls.destroy(); };
  }, [src, isHls]);

  function onTime() {
    const v = ref.current; if (!v) return;
    if (skipIntro && introEnd && v.currentTime >= (introStart || 0) && v.currentTime < introEnd) v.currentTime = introEnd;
  }
  if (error) return <PlayerError msg={error} />;
  return <video ref={ref} controls autoPlay onTimeUpdate={onTime} onError={() => setError('Trình duyệt không tải được (CORS/403).')} onEnded={() => autoNext && onEnded()} className="h-full w-full" />;
}

function Player(props: PlayerProps) {
  const { url } = props;
  if (!url) return <div className="grid h-full place-items-center text-ink-400"><div className="text-center"><Play size={40} className="mx-auto opacity-50" /><p className="mt-2 text-sm">Tập này chưa có link xem</p></div></div>;
  const yt = ytId(url);
  if (yt) return <iframe src={`https://www.youtube.com/embed/${yt}?autoplay=1`} className="h-full w-full" allowFullScreen title="Player" />;
  if (/\.m3u8(\?|$)/i.test(url)) return <VideoPlayer {...props} isHls />;
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return <VideoPlayer {...props} isHls={false} />;
  return <iframe src={url} className="h-full w-full" allowFullScreen title="Player" />;
}

interface CommentT { id: string; content: string; createdAt: string; authorId: string; author: { id: string; username: string; displayName?: string | null; avatar?: string | null } }
interface ServerT { id: string; name: string; videoUrl: string; referer?: string | null }

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

  const episodes = useMemo(() => {
    const list = [...(ep?.episodes || [])];
    list.sort((a, b) => (asc ? a.number - b.number : b.number - a.number));
    if (!q.trim()) return list;
    return list.filter((e: any) => String(e.number).includes(q.trim()));
  }, [ep?.episodes, q, asc]);

  async function saveEntry(patch: { favorite?: boolean; score?: number | null }) {
    if (!user) { router.push('/login'); return; }
    const next = { favorite: entry?.favorite ?? false, score: entry?.score ?? null, ...patch };
    setEntry(next);
    try { await api.put(`/anime/me/entry/${ep.media.id}`, patch); } catch {}
  }
  function goNext() { if (ep?.next) router.push(`/anime/watch?ep=${ep.next.id}`); }
  async function postComment(content: string) {
    if (!content.trim()) return;
    if (!user) { router.push('/login'); return; }
    setPosting(true);
    try { const c = await api.post<CommentT>(`/anime/episode/${id}/comments`, { content }); setComments((cs) => [c, ...cs]); setText(''); }
    catch (e: any) { setErr(e.message); } finally { setPosting(false); }
  }
  function submitComment(e: React.FormEvent) { e.preventDefault(); postComment(text); }
  async function delComment(cid: string) {
    if (!confirm('Xoá bình luận?')) return;
    try { await api.del(`/anime/comment/${cid}`); setComments(comments.filter((c) => c.id !== cid)); } catch {}
  }

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!ep) return <p className="p-10 text-center text-ink-500">Đang tải…</p>;
  const isMod = user?.role === 'ADMIN' || user?.role === 'MODERATOR';
  const servers: ServerT[] = ep.servers || [];
  const cur = servers[serverIdx] || servers[0] || null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <a href={`/anime/detail?slug=${ep.media.slug}`} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> {ep.media.titleEnglish || ep.media.title}</a>

      {/* Player */}
      <div className="overflow-hidden rounded-xl bg-black shadow-card">
        <div className="aspect-video w-full">
          <Player url={cur?.videoUrl || ''} referer={cur?.referer} introStart={ep.media.introStart} introEnd={ep.media.introEnd} skipIntro={skipIntro} autoNext={autoNext} onEnded={goNext} />
        </div>
        {/* Thanh hành động */}
        <div className="grid grid-cols-5 divide-x divide-white/10 border-t border-white/10 bg-ink-900 text-white">
          <button onClick={() => saveEntry({ favorite: !entry?.favorite })} className="flex flex-col items-center gap-1 py-3 text-xs hover:bg-white/5">
            <Heart size={20} className={entry?.favorite ? 'fill-rose-500 text-rose-500' : ''} /> Theo dõi
          </button>
          <button onClick={() => setRateOpen(true)} className="flex flex-col items-center gap-1 py-3 text-xs hover:bg-white/5">
            <Star size={20} className={entry?.score ? 'fill-amber-400 text-amber-400' : ''} /> {entry?.score ? `Đã chấm ${entry.score}` : 'Đánh giá'}
          </button>
          <a href={ep.prev ? `/anime/watch?ep=${ep.prev.id}` : undefined} className={`flex flex-col items-center gap-1 py-3 text-xs ${ep.prev ? 'hover:bg-white/5' : 'opacity-40'}`}><SkipBack size={20} /> Trước</a>
          <a href={ep.next ? `/anime/watch?ep=${ep.next.id}` : undefined} className={`flex flex-col items-center gap-1 py-3 text-xs ${ep.next ? 'hover:bg-white/5' : 'opacity-40'}`}><SkipForward size={20} /> Tiếp</a>
          <button onClick={() => setMoreOpen((o) => !o)} className="flex flex-col items-center gap-1 py-3 text-xs hover:bg-white/5"><MoreHorizontal size={20} /> Khác</button>
        </div>
        {/* Panel "Khác" */}
        {moreOpen && (
          <div className="space-y-2 border-t border-white/10 bg-ink-900 p-4 text-white">
            <label className="flex cursor-pointer items-center justify-between text-sm">
              <span>Tự chuyển tập tiếp theo</span>
              <span onClick={toggleAutoNext} className={`relative h-6 w-11 rounded-full transition ${autoNext ? 'bg-brand-500' : 'bg-white/20'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${autoNext ? 'left-[22px]' : 'left-0.5'}`} /></span>
            </label>
            <label className="flex cursor-pointer items-center justify-between text-sm">
              <span>Bỏ qua giới thiệu {ep.media.introEnd ? `(${ep.media.introStart || 0}s–${ep.media.introEnd}s)` : '(chưa cấu hình)'}</span>
              <span onClick={toggleSkipIntro} className={`relative h-6 w-11 rounded-full transition ${skipIntro ? 'bg-brand-500' : 'bg-white/20'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${skipIntro ? 'left-[22px]' : 'left-0.5'}`} /></span>
            </label>
            {!ep.media.introEnd && <p className="text-xs text-white/40">Admin cần đặt thời gian giới thiệu thì tính năng bỏ qua mới hoạt động.</p>}
          </div>
        )}
      </div>

      {/* Đổi server */}
      {servers.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-sm font-medium text-ink-500"><Server size={15} /> Đổi server:</span>
          {servers.map((s, i) => (
            <button key={s.id} onClick={() => setServerIdx(i)} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${i === serverIdx ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{s.name}</button>
          ))}
        </div>
      )}

      <h1 className="text-lg font-bold">Tập {ep.number}{ep.title ? `: ${ep.title}` : ''}</h1>

      {/* Chọn tập */}
      {ep.episodes?.length > 0 && (
        <div className="card space-y-3 p-4">
          <div className="flex items-center gap-2">
            <h2 className="flex items-center gap-1.5 font-semibold"><Search size={16} /> Chọn tập</h2>
            <button onClick={() => setAsc((a) => !a)} className="ml-auto inline-flex items-center gap-1 rounded-lg bg-ink-100 px-2.5 py-1 text-xs dark:bg-ink-800"><ArrowDownUp size={13} /> {asc ? 'Tăng dần' : 'Giảm dần'}</button>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-ink-200 px-2 dark:border-ink-700">
            <Search size={15} className="text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nhập số tập…" className="w-full bg-transparent py-2 text-sm outline-none" />
          </div>
          <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-5">
            {episodes.map((e: any) => (
              <a key={e.id} href={`/anime/watch?ep=${e.id}`} className={`grid place-items-center rounded-lg py-2.5 text-sm font-medium ${e.id === id ? 'bg-brand-600 text-white' : 'bg-ink-100 hover:bg-brand-50 dark:bg-ink-800 dark:hover:bg-ink-700'}`}>{e.number}</a>
            ))}
          </div>
        </div>
      )}

      {/* Bình luận tập này */}
      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Bình luận tập {ep.number} ({comments.length})</h2>
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
            <button type="submit" disabled={posting || !text.trim()} className="flex w-12 shrink-0 items-center justify-center self-stretch rounded-lg bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"><Send size={18} /></button>
          </form>
        ) : (
          <p className="mb-4 text-sm text-ink-500"><a href="/login" className="text-brand-600 hover:underline">Đăng nhập</a> để bình luận.</p>
        )}
        <div className="space-y-3">
          {comments.length === 0 && <p className="text-sm text-ink-500">Chưa có bình luận nào.</p>}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <Avatar user={c.author} size={32} />
              <div className="min-w-0 flex-1 rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink-700 dark:text-ink-200">{c.author.displayName || c.author.username}</span>
                  <span className="text-[11px] text-ink-400">{new Date(c.createdAt).toLocaleDateString('vi')}</span>
                  {user && (c.authorId === user.id || isMod) && <button onClick={() => delComment(c.id)} className="ml-auto text-ink-400 hover:text-red-500"><Trash2 size={13} /></button>}
                </div>
                {isStickerContent(c.content)
                  ? <img src={c.content.trim()} alt="sticker" className="mt-1 h-24 w-24 object-contain" />
                  : <p className="whitespace-pre-line break-words text-sm text-ink-700 dark:text-ink-200">{c.content}</p>}
              </div>
            </div>
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
                <span className="text-2xl">{r.emoji}</span> <span className="font-medium">{r.label}</span>
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
