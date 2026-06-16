'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Heart, ImagePlus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';

interface Owner { id: string; username: string; displayName?: string | null; avatar?: string | null }
interface Media {
  id: string; url: string; caption?: string | null; likeCount: number; createdAt: string; owner: Owner;
}
interface Album {
  id: string; title: string; description?: string | null; coverUrl?: string | null;
  mediaCount: number; createdAt: string; owner: Owner; media: Media[];
}

function AlbumView() {
  const id = useSearchParams().get('id') || '';
  const { user } = useAuth();
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const isMod = user && (user.role === 'ADMIN' || user.role === 'MODERATOR');
  const canManage = !!album && !!user && (album.owner.id === user.id || isMod);

  async function load() {
    if (!id) return;
    setLoading(true);
    try { setAlbum(await api.get<Album>(`/gallery/albums/${id}`)); }
    catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  async function addMedia(e: React.FormEvent) {
    e.preventDefault();
    if (!album || !url.trim()) return;
    setBusy(true); setErr('');
    try {
      await api.post(`/gallery/albums/${album.id}/media`, { url, caption });
      setUrl(''); setCaption(''); load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function removeMedia(mediaId: string) {
    if (!confirm('Xoá ảnh này?')) return;
    try { await api.del(`/gallery/media/${mediaId}`); load(); } catch (e: any) { alert(e.message); }
  }

  if (loading) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;
  if (err && !album) return <div className="card p-8 text-center text-red-500">{err}</div>;
  if (!album) return null;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h1 className="text-xl font-bold sm:text-2xl">{album.title}</h1>
        {album.description && <p className="mt-1 text-sm text-ink-500">{album.description}</p>}
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-500">
          <Avatar user={album.owner} size={24} />
          <span>{album.owner.displayName || album.owner.username}</span>
          <span>·</span>
          <span>{album.mediaCount} ảnh</span>
        </div>
      </div>

      {canManage && (
        <form onSubmit={addMedia} className="card space-y-2 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><ImagePlus size={16} /> Thêm ảnh</h3>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL ảnh (https://…)" className="input w-full" />
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Chú thích (tuỳ chọn)" className="input w-full" />
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex justify-end">
            <button type="submit" disabled={busy || !url.trim()} className="btn-primary !py-1.5 text-sm disabled:opacity-50">{busy ? 'Đang thêm…' : 'Thêm ảnh'}</button>
          </div>
        </form>
      )}

      {album.media.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">Album chưa có ảnh nào.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {album.media.map((m) => (
            <div key={m.id} className="card group relative overflow-hidden">
              <a href={`/gallery/media?id=${m.id}`}>
                <div className="aspect-square overflow-hidden bg-ink-100 dark:bg-ink-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.caption || ''} className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
                <div className="flex items-center justify-between gap-2 p-2 text-xs text-ink-500">
                  <span className="truncate">{m.caption}</span>
                  <span className="flex shrink-0 items-center gap-1"><Heart size={12} /> {m.likeCount}</span>
                </div>
              </a>
              {canManage && (
                <button onClick={() => removeMedia(m.id)} title="Xoá ảnh"
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition group-hover:opacity-100">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AlbumPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}>
      <AlbumView />
    </Suspense>
  );
}
