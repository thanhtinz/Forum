'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Play, Heart, Star, BookOpen, Clapperboard, RefreshCw, Send, Trash2, Smile } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import { EmojiStickerPicker, isStickerContent } from '@/components/EmojiStickerPicker';

const STATUS_LABEL: Record<string, string> = {
  RELEASING: 'Đang phát hành', FINISHED: 'Hoàn thành', NOT_YET_RELEASED: 'Sắp ra mắt', HIATUS: 'Tạm ngưng', CANCELLED: 'Đã huỷ',
};
const SEASON_LABEL: Record<string, string> = { WINTER: 'Đông', SPRING: 'Xuân', SUMMER: 'Hạ', FALL: 'Thu' };
const FORMAT_LABEL: Record<string, string> = {
  TV: 'TV', MOVIE: 'Phim lẻ', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Special', NOVEL: 'Light Novel', MANHUA: 'Manhua', DONGHUA: 'Donghua',
};
const TYPE_COUNTRY: Record<string, string> = { DONGHUA: 'Trung Quốc', MANHUA: 'Trung Quốc', MANHWA: 'Hàn Quốc' };

interface CommentT {
  id: string; content: string; createdAt: string; authorId: string; parentId?: string | null;
  episodeId?: string; episodeNumber?: number;
  author: { id: string; username: string; displayName?: string | null; avatar?: string | null };
  replies?: CommentT[];
}

function buildCommentTree(flat: CommentT[]): CommentT[] {
  const map = new Map<string, CommentT & { replies: CommentT[] }>();
  const roots: (CommentT & { replies: CommentT[] })[] = [];
  for (const c of flat) map.set(c.id, { ...c, replies: [] });
  for (const c of flat) {
    if (c.parentId && map.has(c.parentId)) map.get(c.parentId)!.replies.push(map.get(c.id)!);
    else roots.push(map.get(c.id)!);
  }
  return roots;
}

function getDescendantIds(cid: string, flat: CommentT[]): string[] {
  const children = flat.filter((c) => c.parentId === cid);
  return [cid, ...children.flatMap((c) => getDescendantIds(c.id, flat))];
}

function Detail() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const router = useRouter();
  const [w, setW] = useState<any>(null);
  const [err, setErr] = useState('');
  const [fav, setFav] = useState(false);
  const [comments, setComments] = useState<CommentT[]>([]);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [picker, setPicker] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyPosting, setReplyPosting] = useState(false);

  const isMod = user?.role === 'ADMIN' || user?.role === 'MODERATOR';

  useEffect(() => {
    if (!slug) return;
    api.get<any>(`/anime/${slug}`).then(setW).catch((e) => setErr(e.message));
    api.get<CommentT[]>(`/anime/${slug}/comments`).then((r) => setComments(r || [])).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!user || !w?.id) return;
    api.get<any>(`/anime/me/entry/${w.id}`).then((e) => setFav(!!e?.favorite)).catch(() => {});
  }, [user, w?.id]);

  async function toggleFav() {
    if (!user) { router.push('/login'); return; }
    const next = !fav; setFav(next);
    try { await api.put(`/anime/me/entry/${w.id}`, { favorite: next }); } catch {}
  }

  async function postComment(content: string, parentId?: string | null) {
    if (!content.trim()) return;
    if (!user) { router.push('/login'); return; }
    const epId = parentId
      ? (comments.find((c) => c.id === parentId)?.episodeId ?? w?.episodeList?.[0]?.id)
      : w?.episodeList?.[0]?.id;
    if (!epId) return;
    if (parentId) setReplyPosting(true); else setPosting(true);
    try {
      const c = await api.post<CommentT>(`/anime/episode/${epId}/comments`, { content, parentId: parentId || undefined });
      const ep = w?.episodeList?.find((e: any) => e.id === epId);
      setComments((cs) => [...cs, { ...c, episodeId: epId, episodeNumber: ep?.number }]);
      if (parentId) { setReplyTexts((t) => ({ ...t, [parentId]: '' })); setReplyingToId(null); }
      else setText('');
    } catch {}
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
  if (!w) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const firstEp = w.episodeList?.[0];
  const firstCh = w.chapterList?.[0];
  const chars = w.characters || [];
  const heroBg = w.bannerUrl || w.coverUrl;
  const airedCount = w.episodeList?.length ?? 0;
  const ytId = w.trailerUrl?.match(/[?&]v=([\w-]+)/)?.[1];

  return (
    <div className="space-y-4">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="h-52 w-full sm:h-64">
          {heroBg
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={heroBg} alt="" className="h-full w-full object-cover object-top" />
            : <div className="h-full bg-gradient-to-br from-brand-800 to-brand-600" />}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/85" />
        {/* Nút yêu thích – góc trên phải */}
        <button
          onClick={toggleFav}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 backdrop-blur-sm transition hover:bg-black/60 ${fav ? 'text-rose-500' : 'text-white'}`}
          title={fav ? 'Bỏ yêu thích' : 'Yêu thích'}
        >
          <Heart size={18} className={fav ? 'fill-rose-500' : ''} />
        </button>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-4">
          <div className="h-32 w-[88px] overflow-hidden rounded-xl border border-white/25 shadow-2xl">
            {w.coverUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={w.coverUrl} alt={w.title} className="h-full w-full object-cover" />
              : <div className="h-full bg-ink-700" />}
          </div>
          <h1 className="mt-2 text-center text-xl font-bold leading-tight text-white drop-shadow-md">{w.title}</h1>
          {w.titleEnglish && w.titleEnglish !== w.title && (
            <p className="text-center text-sm leading-tight text-white/70">{w.titleEnglish}</p>
          )}
        </div>
      </div>

      {/* ── Meta badges ── */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {w.format && (
          <span className="rounded-md border border-ink-300 px-2 py-0.5 text-xs font-bold uppercase text-ink-600 dark:border-ink-600 dark:text-ink-300">
            {FORMAT_LABEL[w.format] ?? w.format}
          </span>
        )}
        {w.avgScore > 0 && (
          <span className="rounded-md border border-amber-400 px-2 py-0.5 text-xs font-bold text-amber-500">★ {w.avgScore.toFixed(1)}</span>
        )}
        {w.seasonYear && (
          <span className="rounded-md border border-ink-300 px-2 py-0.5 text-xs text-ink-500 dark:border-ink-600 dark:text-ink-400">{w.seasonYear}</span>
        )}
        {w.episodes != null && (
          <span className="rounded-md border border-ink-300 px-2 py-0.5 text-xs text-ink-500 dark:border-ink-600 dark:text-ink-400">
            {w.episodeList?.length > 0 ? `Tập ${w.episodeList.length}` : `${w.episodes} tập`}
          </span>
        )}
      </div>

      {/* ── Genres ── */}
      {w.genres?.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {w.genres.slice(0, 6).map((g: any) => (
            <a key={g.slug} href={`/hoat-hinh?genre=${g.slug}`}
              className="rounded-full border border-ink-200 px-3 py-1 text-sm text-ink-600 hover:border-amber-400 hover:text-amber-500 dark:border-ink-700 dark:text-ink-300">
              {g.name}
            </a>
          ))}
        </div>
      )}

      {/* ── Status pill ── */}
      {w.status === 'RELEASING' && airedCount > 0 && w.episodes && (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
            <RefreshCw size={13} /> Đã chiếu: {airedCount} / {w.episodes} tập
          </span>
        </div>
      )}

      {/* ── Description ── */}
      {w.description && (
        <div>
          <p className="mb-1 font-bold">Giới thiệu:</p>
          <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{w.description}</p>
        </div>
      )}

      {/* ── Info rows ── */}
      <div className="space-y-1.5 text-sm">
        {w.duration != null && <MetaRow label="Thời lượng" value={`${w.duration}m`} />}
        {TYPE_COUNTRY[w.type] && <MetaRow label="Quốc gia" value={TYPE_COUNTRY[w.type]} />}
        {w.seasonYear && w.season && (
          <MetaRow label="Mùa" value={`${SEASON_LABEL[w.season] ?? w.season} ${w.seasonYear}`} />
        )}
        {w.studios?.length > 0 && <MetaRow label="Studio" value={w.studios.map((s: any) => s.name).join(', ')} />}
        {w.source && <MetaRow label="Nguồn" value={w.source} />}
      </div>

      {/* ── CTA ── */}
      {firstEp && (
        <a href={`/anime/watch?ep=${firstEp.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-brand-600 active:scale-95">
          <Play size={20} className="fill-white" /> Xem Ngay
        </a>
      )}
      {firstCh && !firstEp && (
        <a href={`/manga/read?id=${firstCh.id}`}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-brand-600 active:scale-95">
          <BookOpen size={20} /> Đọc Ngay
        </a>
      )}

      {/* ── Bình luận ── */}
      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Bình luận ({comments.length})</h2>
        {user ? (
          <form onSubmit={submitComment} className="relative mb-4 flex items-start gap-2">
            <Avatar user={user} size={32} />
            <div className="relative flex-1">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Viết bình luận…" className="input w-full resize-none pr-9" />
              <button type="button" onClick={() => setPicker((v) => !v)}
                className={`absolute right-2 top-2 rounded p-1 hover:bg-ink-100 dark:hover:bg-ink-800 ${picker ? 'text-brand-600' : 'text-ink-400'}`}
                title="Emoji / Sticker">
                <Smile size={18} />
              </button>
              {picker && (
                <EmojiStickerPicker
                  onEmoji={(e) => setText((t) => t + e)}
                  onSticker={(url) => { setPicker(false); postComment(url); }}
                  onClose={() => setPicker(false)}
                />
              )}
            </div>
            <button type="submit" disabled={posting || !text.trim()}
              className="mt-1 inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm text-white disabled:opacity-50 hover:bg-brand-700">
              <Send size={14} />
            </button>
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

      {/* ── Phim liên quan ── */}
      {w.relatedFrom?.length > 0 && (
        <div>
          <h2 className="mb-3 font-semibold">Phim liên quan</h2>
          <div className="space-y-2">
            {w.relatedFrom.map((r: any) => (
              <a key={r.id} href={`/anime/detail?slug=${r.to.slug}`}
                className="flex items-center gap-3 rounded-xl border border-ink-200 p-2.5 transition-colors hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800">
                <div className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                  {r.to.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.to.coverUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold leading-tight">{r.to.title}</p>
                  {r.to.titleEnglish && r.to.titleEnglish !== r.to.title && (
                    <p className="truncate text-sm text-ink-500">{r.to.titleEnglish}</p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-400">{r.type}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Trailer ── */}
      {ytId && (
        <div className="card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 font-semibold"><Clapperboard size={16} /> Trailer</h2>
          <div className="aspect-video overflow-hidden rounded-lg">
            <iframe src={`https://www.youtube.com/embed/${ytId}`} className="h-full w-full" allowFullScreen title="Trailer" />
          </div>
        </div>
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
  const [replyPicker, setReplyPicker] = useState(false);
  return (
    <div className={indent > 0 ? 'ml-6 border-l-2 border-ink-200 pl-3 dark:border-ink-700' : ''}>
      <div className="flex items-start gap-2">
        <Avatar user={c.author} size={depth > 0 ? 26 : 32} />
        <div className="min-w-0 flex-1 rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-ink-700 dark:text-ink-200">{c.author.displayName || c.author.username}</span>
            {c.episodeNumber != null && depth === 0 && (
              <span className="rounded bg-ink-200 px-1.5 py-0.5 text-[10px] text-ink-500 dark:bg-ink-700">Tập {c.episodeNumber}</span>
            )}
            <span className="text-[11px] text-ink-400">{new Date(c.createdAt).toLocaleDateString('vi')}</span>
            {user && (c.authorId === user.id || isMod) && (
              <button onClick={() => onDel(c.id)} className="ml-auto text-ink-400 hover:text-red-500"><Trash2 size={13} /></button>
            )}
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
                <div className="relative">
                  <textarea
                    autoFocus rows={2}
                    value={replyTexts[c.id] || ''}
                    onChange={(e) => setReplyTexts((t) => ({ ...t, [c.id]: e.target.value }))}
                    placeholder={`Trả lời @${c.author.displayName || c.author.username}…`}
                    className="input w-full resize-none pr-8 text-sm"
                  />
                  <button type="button" onClick={() => setReplyPicker((v) => !v)}
                    className={`absolute right-2 top-2 rounded p-0.5 hover:bg-ink-100 dark:hover:bg-ink-700 ${replyPicker ? 'text-brand-600' : 'text-ink-400'}`}>
                    <Smile size={15} />
                  </button>
                  {replyPicker && (
                    <EmojiStickerPicker
                      onEmoji={(e) => setReplyTexts((t) => ({ ...t, [c.id]: (t[c.id] || '') + e }))}
                      onSticker={(url) => { setReplyPicker(false); onReply(url, c.id); }}
                      onClose={() => setReplyPicker(false)}
                    />
                  )}
                </div>
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

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-bold">{label}: </span>
      <span className="text-ink-500">{value}</span>
    </p>
  );
}

export default function AnimeDetailPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><Detail /></Suspense>;
}
