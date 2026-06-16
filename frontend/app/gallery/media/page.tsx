'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Heart, Eye, Trash2, FolderOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';

interface Owner { id: string; username: string; displayName?: string | null; avatar?: string | null }
interface Comment { id: string; content: string; createdAt: string; authorId: string; author: Owner }
interface Media {
  id: string; url: string; caption?: string | null; likeCount: number; viewCount: number;
  createdAt: string; owner: Owner; album?: { id: string; title: string } | null; comments: Comment[];
}

function MediaView() {
  const id = useSearchParams().get('id') || '';
  const { user } = useAuth();
  const [media, setMedia] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const isMod = user && (user.role === 'ADMIN' || user.role === 'MODERATOR');

  async function load() {
    if (!id) return;
    setLoading(true);
    try { setMedia(await api.get<Media>(`/gallery/media/${id}`)); }
    catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function like() {
    if (!media) return;
    try { const m = await api.post<Media>(`/gallery/media/${media.id}/like`); setMedia({ ...media, likeCount: m.likeCount }); } catch {}
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!media || !comment.trim()) return;
    setBusy(true);
    try {
      const c = await api.post<Comment>(`/gallery/media/${media.id}/comments`, { content: comment });
      setMedia({ ...media, comments: [...media.comments, c] });
      setComment('');
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  }

  async function removeComment(commentId: string) {
    if (!media) return;
    if (!confirm('Xoá bình luận này?')) return;
    try {
      await api.del(`/gallery/comments/${commentId}`);
      setMedia({ ...media, comments: media.comments.filter((c) => c.id !== commentId) });
    } catch (e: any) { alert(e.message); }
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (err && !media) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!media) return null;

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex justify-center bg-ink-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.url} alt={media.caption || ''} className="max-h-[70vh] w-auto object-contain" />
        </div>
        <div className="p-4">
          {media.caption && <p className="text-base">{media.caption}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-500">
            <span className="flex items-center gap-2">
              <Avatar user={media.owner} size={24} />
              {media.owner.displayName || media.owner.username}
            </span>
            {media.album && (
              <a href={`/gallery/album?id=${media.album.id}`} className="flex items-center gap-1 text-brand-600">
                <FolderOpen size={14} /> {media.album.title}
              </a>
            )}
            <span className="flex items-center gap-1"><Eye size={14} /> {media.viewCount}</span>
            <button onClick={like} disabled={!user}
              className="flex items-center gap-1 rounded-full bg-ink-100 px-3 py-1 font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:bg-ink-800">
              <Heart size={14} /> {media.likeCount}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="font-semibold">Bình luận ({media.comments.length})</h3>
        <div className="mt-3 space-y-3">
          {media.comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar user={c.author} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <span className="font-medium text-ink-700 dark:text-ink-200">{c.author.displayName || c.author.username}</span>
                  <span>{(() => { try { return formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: vi }); } catch { return ''; } })()}</span>
                  {user && (c.authorId === user.id || isMod) && (
                    <button onClick={() => removeComment(c.id)} className="text-ink-400 hover:text-red-500"><Trash2 size={12} /></button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.content}</p>
              </div>
            </div>
          ))}
          {media.comments.length === 0 && <p className="text-sm text-ink-500">Chưa có bình luận nào.</p>}
        </div>

        {user ? (
          <form onSubmit={submitComment} className="mt-4 space-y-2">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
              placeholder="Viết bình luận…" className="input w-full resize-y" />
            <div className="flex justify-end">
              <button type="submit" disabled={busy || !comment.trim()} className="btn-primary !py-1.5 text-sm disabled:opacity-50">{busy ? 'Đang gửi…' : 'Gửi'}</button>
            </div>
          </form>
        ) : (
          <p className="mt-4 text-center text-sm text-ink-500">
            Vui lòng <a href="/login" className="font-medium text-brand-600">đăng nhập</a> để bình luận.
          </p>
        )}
      </div>
    </div>
  );
}

export default function MediaPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <MediaView />
    </Suspense>
  );
}
