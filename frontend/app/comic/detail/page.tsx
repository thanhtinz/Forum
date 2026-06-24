'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BookOpen, Heart, Send, Smile, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { Avatar } from '@/components/Header';
import { EmojiStickerPicker, isStickerContent } from '@/components/EmojiStickerPicker';

const STATUS_LABEL: Record<string, string> = {
  RELEASING: 'Đang tiến hành', FINISHED: 'Hoàn thành', NOT_YET_RELEASED: 'Sắp ra mắt', HIATUS: 'Tạm ngưng', CANCELLED: 'Đã drop',
};
const FORMAT_LABEL: Record<string, string> = {
  MANHUA: 'Manhua', MANHWA: 'Manhwa', MANGA: 'Manga', NOVEL: 'Tiểu thuyết', ONE_SHOT: 'One Shot', DOUJINSHI: 'Doujinshi',
};
const TYPE_COUNTRY: Record<string, string> = { MANHUA: 'Trung Quốc', MANHWA: 'Hàn Quốc', MANGA: 'Nhật Bản' };

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

function ComicDetail() {
  const slug = useSearchParams().get('slug') || '';
  const { user } = useAuth();
  const router = useRouter();
  const [w, setW] = useState<any>(null);
  const [err, setErr] = useState('');
  const [fav, setFav] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
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
    if (w && w.type === 'DONGHUA') {
      router.replace(`/movie/detail?slug=${slug}`);
    }
  }, [w, slug, router]);

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
    const epId = w?.episodeList?.[0]?.id;
    if (!epId) return;
    if (parentId) setReplyPosting(true); else setPosting(true);
    try {
      const c = await api.post<CommentT>(`/anime/episode/${epId}/comments`, { content, parentId: parentId || undefined });
      setComments((cs) => [...cs, { ...c, episodeId: epId }]);
      if (parentId) { setReplyTexts((t) => ({ ...t, [parentId]: '' })); setReplyingToId(null); }
      else setText('');
    } catch {}
    finally { setPosting(false); setReplyPosting(false); }
  }

  async function delComment(cid: string) {
    if (!confirm('Xoá bình luận?')) return;
    try {
      await api.del(`/anime/comment/${cid}`);
      const toRemove = new Set(getDescendantIds(cid, comments));
      setComments((cs) => cs.filter((c) => !toRemove.has(c.id)));
    } catch {}
  }

  if (err) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!w || w.type === 'DONGHUA') return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const chapters: any[] = [...(w.chapterList || [])].reverse();
  const firstCh = w.chapterList?.[0];
  const lastCh = w.chapterList?.[w.chapterList.length - 1];
  const favCount = w.favCount ?? w.favoriteCount ?? 0;
  const viewCount = w.viewCount ?? 0;
  const updatedAt = w.updatedAt ? new Date(w.updatedAt).toLocaleDateString('vi') : null;

  const descTrimAt = 200;
  const descLong = (w.description || '').length > descTrimAt;
  const displayDesc = descLong && !descExpanded ? (w.description || '').slice(0, descTrimAt) + '…' : (w.description || '');

  return (
    <div className="space-y-4 pb-8">
      {/* ── Cover + Title ── */}
      <div className="flex flex-col items-center pt-2">
        <div className="group relative h-52 w-36 overflow-hidden rounded-xl shadow-lg">
          {w.coverUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={w.coverUrl} alt={w.title} className="h-full w-full object-cover" />
            : <div className="h-full w-full bg-ink-200 dark:bg-ink-700" />}
        </div>
        <h1 className="mt-3 text-center text-xl font-bold leading-tight">{w.title}</h1>
        {w.titleEnglish && w.titleEnglish !== w.title && (
          <p className="mt-0.5 text-center text-sm text-ink-500">{w.titleEnglish}</p>
        )}
      </div>

      {/* ── Info table ── */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-ink-100 dark:divide-ink-700/50">
            {w.author && (
              <tr>
                <td className="w-28 px-3 py-2 font-semibold text-ink-500">Tác giả</td>
                <td className="px-3 py-2">{w.author}</td>
              </tr>
            )}
            {w.artist && w.artist !== w.author && (
              <tr>
                <td className="w-28 px-3 py-2 font-semibold text-ink-500">Họa sĩ</td>
                <td className="px-3 py-2">{w.artist}</td>
              </tr>
            )}
            {w.publisher && (
              <tr>
                <td className="w-28 px-3 py-2 font-semibold text-ink-500">Nhóm dịch</td>
                <td className="px-3 py-2">{w.publisher}</td>
              </tr>
            )}
            <tr>
              <td className="w-28 px-3 py-2 font-semibold text-ink-500">Tổng số chap</td>
              <td className="px-3 py-2">{w.chapters ?? w.chapterList?.length ?? '?'} chương</td>
            </tr>
            <tr>
              <td className="w-28 px-3 py-2 font-semibold text-ink-500">Tình trạng</td>
              <td className="px-3 py-2">
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  w.status === 'FINISHED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  w.status === 'RELEASING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-ink-100 text-ink-500 dark:bg-ink-800'
                }`}>
                  {STATUS_LABEL[w.status] ?? w.status}
                </span>
              </td>
            </tr>
            {w.format && (
              <tr>
                <td className="w-28 px-3 py-2 font-semibold text-ink-500">Định dạng</td>
                <td className="px-3 py-2">{FORMAT_LABEL[w.format] ?? w.format}</td>
              </tr>
            )}
            {TYPE_COUNTRY[w.type] && (
              <tr>
                <td className="w-28 px-3 py-2 font-semibold text-ink-500">Quốc gia</td>
                <td className="px-3 py-2">{TYPE_COUNTRY[w.type]}</td>
              </tr>
            )}
            <tr>
              <td className="w-28 px-3 py-2 font-semibold text-ink-500">Lượt xem</td>
              <td className="px-3 py-2">{viewCount.toLocaleString('vi')}</td>
            </tr>
            {updatedAt && (
              <tr>
                <td className="w-28 px-3 py-2 font-semibold text-ink-500">Cập nhật</td>
                <td className="px-3 py-2">{updatedAt}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Genre tags ── */}
      {w.genres?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {w.genres.map((g: any) => (
            <a key={g.slug} href={`/comic?genre=${g.slug}`}
              className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300">
              {g.name}
            </a>
          ))}
        </div>
      )}

      {/* ── CTA buttons ── */}
      <div className="grid grid-cols-2 gap-2">
        {firstCh ? (
          <a href={`/comic/read?id=${firstCh.id}`}
            className="flex items-center justify-center gap-2 rounded-full bg-brand-700 py-3 text-sm font-bold text-white shadow transition hover:bg-brand-600 active:scale-95">
            <BookOpen size={16} /> Đọc từ đầu
          </a>
        ) : (
          <button disabled className="flex items-center justify-center gap-2 rounded-full bg-ink-200 py-3 text-sm font-bold text-ink-400 dark:bg-ink-700">
            <BookOpen size={16} /> Đọc từ đầu
          </button>
        )}
        {lastCh ? (
          <a href={`/comic/read?id=${lastCh.id}`}
            className="flex items-center justify-center gap-2 rounded-full border-2 border-brand-600 py-3 text-sm font-bold text-brand-600 transition hover:bg-brand-50 active:scale-95 dark:hover:bg-brand-900/20">
            <BookOpen size={16} /> Đọc mới nhất
          </a>
        ) : (
          <button disabled className="flex items-center justify-center gap-2 rounded-full border-2 border-ink-200 py-3 text-sm font-bold text-ink-400 dark:border-ink-700">
            <BookOpen size={16} /> Đọc mới nhất
          </button>
        )}
      </div>

      {/* ── Follow / Like ── */}
      <div className="flex items-center gap-3">
        <button onClick={toggleFav}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
            fav ? 'bg-rose-500 text-white' : 'border border-ink-200 text-ink-600 hover:border-rose-400 hover:text-rose-500 dark:border-ink-700 dark:text-ink-300'
          }`}>
          <Heart size={16} className={fav ? 'fill-white' : ''} />
          {fav ? 'Đã yêu thích' : 'Yêu thích'}
          {favCount > 0 && <span className="text-xs opacity-70">({favCount})</span>}
        </button>
      </div>

      {/* ── Description ── */}
      {w.description && (
        <div className="card p-4">
          <button className="mb-2 flex w-full items-center justify-between font-bold" onClick={() => setDescExpanded((v) => !v)}>
            <span>Giới Thiệu</span>
            {descExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{displayDesc}</p>
          {descLong && (
            <button className="mt-1.5 text-xs font-medium text-brand-600 hover:underline" onClick={() => setDescExpanded((v) => !v)}>
              {descExpanded ? 'Rút Gọn' : 'Xem thêm'}
            </button>
          )}
        </div>
      )}

      {/* ── Chapter list ── */}
      {chapters.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 font-semibold">
            <span>Danh sách chương</span>
            <span className="text-sm text-ink-500">{chapters.length} chương</span>
          </div>
          <div className="max-h-80 divide-y divide-ink-100 overflow-y-auto dark:divide-ink-700/50">
            {chapters.map((ch: any) => (
              <a key={ch.id} href={`/comic/read?id=${ch.id}`}
                className="flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-ink-50 dark:hover:bg-ink-800">
                <span className="font-medium">
                  Chương {ch.number}{ch.title ? `: ${ch.title}` : ''}
                </span>
                {ch.createdAt && (
                  <span className="ml-2 shrink-0 text-xs text-ink-400">
                    {new Date(ch.createdAt).toLocaleDateString('vi')}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Related manga (horizontal scroll) ── */}
      {w.relatedFrom?.length > 0 && (
        <div>
          <h2 className="mb-2 font-semibold">Truyện liên quan</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {w.relatedFrom.map((r: any) => (
              <a key={r.id} href={r.to.type === 'MANHUA' ? `/comic/detail?slug=${r.to.slug}` : `/movie/detail?slug=${r.to.slug}`}
                className="flex w-28 shrink-0 flex-col gap-1 rounded-xl border border-ink-100 p-1.5 transition hover:border-brand-300 dark:border-ink-700">
                <div className="aspect-[3/4] overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                  {r.to.coverUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.to.coverUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <p className="line-clamp-2 text-center text-[11px] font-medium leading-tight">{r.to.title}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Comments ── */}
      <div className="card p-5">
        <h2 className="mb-3 font-semibold">Bình luận ({comments.length})</h2>
        {user ? (
          <form onSubmit={(e) => { e.preventDefault(); postComment(text); }} className="relative mb-4 flex items-start gap-2">
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

export default function ComicDetailPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><ComicDetail /></Suspense>;
}
