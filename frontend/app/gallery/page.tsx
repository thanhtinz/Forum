'use client';

import { useEffect, useState } from 'react';
import { Heart, Images, Plus, FolderOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { Avatar } from '@/components/Header';
import { useAuth } from '@/components/AuthProvider';
import ImageUpload from '@/components/ImageUpload';

interface Owner { id: string; username: string; displayName?: string | null; avatar?: string | null }
interface Album {
  id: string; title: string; description?: string | null; coverUrl?: string | null;
  mediaCount: number; createdAt: string; owner: Owner;
}
interface Media {
  id: string; url: string; caption?: string | null; likeCount: number; viewCount: number;
  createdAt: string; owner: Owner; album?: { id: string; title: string } | null;
}
interface Paginated<T> { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } }

export default function GalleryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'media' | 'albums'>('media');
  const [media, setMedia] = useState<Media[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function load() {
    setLoading(true);
    try {
      if (tab === 'media') {
        const r = await api.get<Paginated<Media>>('/gallery/media?limit=36');
        setMedia(r.data);
      } else {
        const r = await api.get<Paginated<Album>>('/gallery/albums?limit=36');
        setAlbums(r.data);
      }
    } catch { /* ignore */ } finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true); setErr('');
    try {
      const a = await api.post<Album>('/gallery/albums', { title, description, coverUrl: coverUrl || undefined });
      setShowCreate(false); setTitle(''); setDescription(''); setCoverUrl('');
      window.location.href = `/gallery/album?id=${a.id}`;
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <Images size={24} className="text-brand-600" /> Thư viện ảnh
        </h1>
        {user && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1 !py-1.5 text-sm">
            <Plus size={16} /> Tạo album
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('media')}
          className={`chip ${tab === 'media' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>Ảnh mới</button>
        <button onClick={() => setTab('albums')}
          className={`chip ${tab === 'albums' ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>Album</button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-ink-500">Đang tải…</div>
      ) : tab === 'media' ? (
        media.length === 0 ? (
          <div className="card p-10 text-center text-ink-500">Chưa có ảnh nào.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {media.map((m) => (
              <a key={m.id} href={`/gallery/media?id=${m.id}`} className="card group overflow-hidden">
                <div className="aspect-square overflow-hidden bg-ink-100 dark:bg-ink-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt={m.caption || ''} className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
                <div className="flex items-center justify-between gap-2 p-2 text-xs text-ink-500">
                  <span className="flex items-center gap-1 truncate">
                    <Avatar user={m.owner} size={18} />
                    <span className="truncate">{m.owner.displayName || m.owner.username}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1"><Heart size={12} /> {m.likeCount}</span>
                </div>
              </a>
            ))}
          </div>
        )
      ) : albums.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">Chưa có album nào.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {albums.map((a) => (
            <a key={a.id} href={`/gallery/album?id=${a.id}`} className="card group overflow-hidden">
              <div className="flex aspect-video items-center justify-center overflow-hidden bg-ink-100 dark:bg-ink-900">
                {a.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.coverUrl} alt={a.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <FolderOpen size={32} className="text-ink-400" />
                )}
              </div>
              <div className="p-2">
                <div className="truncate text-sm font-semibold">{a.title}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-ink-500">
                  <span className="flex items-center gap-1 truncate">
                    <Avatar user={a.owner} size={16} />
                    <span className="truncate">{a.owner.displayName || a.owner.username}</span>
                  </span>
                  <span className="shrink-0">{a.mediaCount} ảnh</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setShowCreate(false)}>
          <form onSubmit={createAlbum} className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">Tạo album mới</h3>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề album" className="input mt-3 w-full" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả (tuỳ chọn)" rows={3} className="input mt-2 w-full resize-y" />
            <div className="mt-2">
              <label className="mb-1 block text-xs text-ink-500">Ảnh bìa (tuỳ chọn)</label>
              <ImageUpload external value={coverUrl || undefined} onUploaded={setCoverUrl} label="Tải ảnh bìa" />
            </div>
            {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg bg-ink-100 px-4 py-1.5 text-sm dark:bg-ink-800">Hủy</button>
              <button type="submit" disabled={busy || !title.trim()} className="btn-primary !py-1.5 text-sm disabled:opacity-50">{busy ? 'Đang tạo…' : 'Tạo'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
