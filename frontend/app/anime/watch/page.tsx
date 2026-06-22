'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Heart, Star, SkipBack, SkipForward, ArrowLeft, Search, ArrowDownUp, Send, Trash2, Play } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';

const ytId = (u: string) => u.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/)?.[1] || null;
// Đưa link qua proxy server (gắn Referer đúng, thêm CORS) để vượt chặn hotlink
const proxy = (u: string, ref?: string | null) =>
  `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/anime/hls?u=${encodeURIComponent(u)}${ref ? `&r=${encodeURIComponent(ref)}` : ''}`;

function PlayerError({ msg }: { msg: string }) {
  return (
    <div className="grid h-full place-items-center p-4 text-center text-white/80">
      <div>
        <p className="text-sm font-medium">Không phát được nguồn này</p>
        <p className="mt-1 text-xs text-white/50">{msg}</p>
        <p className="mt-2 text-xs text-white/50">Nguồn có thể chặn hotlink — admin thử đặt <b>Referer</b> cho tập, hoặc đổi nguồn khác.</p>
      </div>
    </div>
  );
}

function HlsVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    setError('');
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      const onErr = () => setError('Trình duyệt không tải được luồng (CORS/403).');
      video.addEventListener('error', onErr);
      return () => video.removeEventListener('error', onErr);
    }
    let hls: any; let cancelled = false;
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled) return;
      if (Hls.isSupported()) {
        hls = new Hls({ maxBufferLength: 30 });
        hls.loadSource(src); hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_e: any, data: any) => { if (data?.fatal) setError(`Lỗi tải luồng (${data.type || 'network'}).`); });
      } else { video.src = src; }
    });
    return () => { cancelled = true; if (hls) hls.destroy(); };
  }, [src]);
  if (error) return <PlayerError msg={error} />;
  return <video ref={ref} controls autoPlay className="h-full w-full" />;
}

function Player({ url, referer }: { url: string; referer?: string | null }) {
  if (!url) return <div className="grid h-full place-items-center text-ink-400"><div className="text-center"><Play size={40} className="mx-auto opacity-50" /><p className="mt-2 text-sm">Tập này chưa có link xem</p></div></div>;
  const yt = ytId(url);
  if (yt) return <iframe src={`https://www.youtube.com/embed/${yt}?autoplay=1`} className="h-full w-full" allowFullScreen title="Player" />;
  if (/\.m3u8(\?|$)/i.test(url)) return <HlsVideo src={proxy(url, referer)} />;
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return <video src={proxy(url, referer)} controls autoPlay className="h-full w-full" />;
  return <iframe src={url} className="h-full w-full" allowFullScreen title="Player" />;
}

interface CommentT { id: string; content: string; createdAt: string; authorId: string; author: { id: string; username: string; displayName?: string | null; avatar?: string | null } }

function Watch() {
  const id = useSearchParams().get('ep') || '';
  const router = useRouter();
  const { user } = useAuth();
  const [ep, setEp] = useState<any>(null);
  const [err, setErr] = useState('');
  // entry (theo dõi / đánh giá)
  const [entry, setEntry] = useState<{ favorite: boolean; score: number | null } | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  // chọn tập
  const [q, setQ] = useState('');
  const [asc, setAsc] = useState(false);
  // bình luận
  const [comments, setComments] = useState<CommentT[]>([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!id) return;
    setErr('');
    api.get<any>(`/anime/episode/${id}`).then((e) => { setEp(e); setComments(e.comments || []); window.scrollTo(0, 0); }).catch((e) => setErr(e.message));
  }, [id]);

  useEffect(() => {
    if (!user || !ep?.media?.id) { setEntry(null); return; }
    api.get<any>(`/anime/me/entry/${ep.media.id}`).then((en) => setEntry(en ? { favorite: en.favorite, score: en.score } : { favorite: false, score: null })).catch(() => {});
  }, [user, ep?.media?.id]);

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
  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    if (!user) { router.push('/login'); return; }
    setPosting(true);
    try { const c = await api.post<CommentT>(`/anime/episode/${id}/comments`, { content: text }); setComments([c, ...comments]); setText(''); }
    catch (e: any) { setErr(e.message); } finally { setPosting(false); }
  }
  async function delComment(cid: string) {
    if (!confirm('Xoá bình luận?')) return;
    try { await api.del(`/anime/comment/${cid}`); setComments(comments.filter((c) => c.id !== cid)); } catch {}
  }

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!ep) return <p className="p-10 text-center text-ink-500">Đang tải…</p>;
  const isMod = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <a href={`/anime/detail?slug=${ep.media.slug}`} className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-brand-600"><ArrowLeft size={15} /> {ep.media.titleEnglish || ep.media.title}</a>

      {/* Player */}
      <div className="overflow-hidden rounded-xl bg-black shadow-card">
        <div className="aspect-video w-full"><Player url={ep.videoUrl || ''} referer={ep.referer} /></div>
        {/* Thanh hành động */}
        <div className="grid grid-cols-4 divide-x divide-white/10 border-t border-white/10 bg-ink-900 text-white">
          <button onClick={() => saveEntry({ favorite: !entry?.favorite })} className="flex flex-col items-center gap-1 py-3 text-xs hover:bg-white/5">
            <Heart size={20} className={entry?.favorite ? 'fill-rose-500 text-rose-500' : ''} /> Theo dõi
          </button>
          <button onClick={() => setRateOpen((o) => !o)} className="flex flex-col items-center gap-1 py-3 text-xs hover:bg-white/5">
            <Star size={20} className={entry?.score ? 'fill-amber-400 text-amber-400' : ''} /> {entry?.score ? `Đã chấm ${entry.score}` : 'Đánh giá'}
          </button>
          <a href={ep.prev ? `/anime/watch?ep=${ep.prev.id}` : undefined} className={`flex flex-col items-center gap-1 py-3 text-xs ${ep.prev ? 'hover:bg-white/5' : 'opacity-40'}`}>
            <SkipBack size={20} /> Trước
          </a>
          <a href={ep.next ? `/anime/watch?ep=${ep.next.id}` : undefined} className={`flex flex-col items-center gap-1 py-3 text-xs ${ep.next ? 'hover:bg-white/5' : 'opacity-40'}`}>
            <SkipForward size={20} /> Tiếp
          </a>
        </div>
        {rateOpen && (
          <div className="flex flex-wrap justify-center gap-1.5 border-t border-white/10 bg-ink-900 p-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button key={n} onClick={() => { saveEntry({ score: entry?.score === n ? null : n }); setRateOpen(false); }}
                className={`grid h-8 w-8 place-items-center rounded text-sm font-semibold ${entry?.score && n <= entry.score ? 'bg-amber-400 text-amber-950' : 'bg-white/10 text-white'}`}>{n}</button>
            ))}
          </div>
        )}
      </div>

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
              <a key={e.id} href={`/anime/watch?ep=${e.id}`}
                className={`grid place-items-center rounded-lg py-2.5 text-sm font-medium ${e.id === id ? 'bg-brand-600 text-white' : 'bg-ink-100 hover:bg-brand-50 dark:bg-ink-800 dark:hover:bg-ink-700'}`}>
                {e.number}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Bình luận tập này */}
      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Bình luận tập {ep.number} ({comments.length})</h2>
        {user ? (
          <form onSubmit={submitComment} className="mb-4 flex items-start gap-2">
            <Avatar user={user} size={32} />
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Viết bình luận về tập này…" className="input flex-1 resize-none" />
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
                <p className="whitespace-pre-line break-words text-sm text-ink-700 dark:text-ink-200">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  return <Suspense fallback={<p className="p-10 text-center text-ink-500">Đang tải…</p>}><Watch /></Suspense>;
}
