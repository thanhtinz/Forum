'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { ImagePlus, UploadCloud, Copy, Check, Trash2, FolderPlus, Clock, Link2, X } from 'lucide-react';
import { api, fetcher, getToken } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

interface Embeds { direct: string; html: string; htmlLink: string; bbcode: string; bbcodeLink: string; markdown: string }
interface HostedImage { id: string; url: string; title?: string | null; size: number; albumId?: string | null; expiresAt?: string | null; createdAt: string; embeds: Embeds }
interface Album { id: string; title: string; mediaCount: number }

const EXPIRY: [string, string][] = [
  ['never', 'Không tự xoá'], ['5m', 'Sau 5 phút'], ['1h', 'Sau 1 giờ'], ['6h', 'Sau 6 giờ'],
  ['1d', 'Sau 1 ngày'], ['1w', 'Sau 1 tuần'], ['1m', 'Sau 1 tháng'],
];
const EMBED_TABS: [keyof Embeds, string][] = [
  ['direct', 'Link trực tiếp'], ['html', 'HTML'], ['htmlLink', 'HTML (có link)'],
  ['bbcode', 'BBCode'], ['bbcodeLink', 'BBCode (có link)'], ['markdown', 'Markdown'],
];

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-stretch gap-1">
      <input readOnly value={value} className="input flex-1 font-mono text-xs" onFocus={(e) => e.target.select()} />
      <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
        className="btn-outline shrink-0 px-2">{copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}</button>
    </div>
  );
}

function EmbedBox({ embeds }: { embeds: Embeds }) {
  const [tab, setTab] = useState<keyof Embeds>('direct');
  return (
    <div className="space-y-2">
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1">
        {EMBED_TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${tab === k ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600 dark:bg-ink-800'}`}>{l}</button>
        ))}
      </div>
      <CopyField value={embeds[tab]} />
    </div>
  );
}

function expiryText(e?: string | null) {
  if (!e) return 'Vĩnh viễn';
  const d = new Date(e), now = Date.now();
  if (d.getTime() <= now) return 'Đã hết hạn';
  return 'Tự xoá ' + d.toLocaleString('vi-VN');
}

export default function ImageHostPage() {
  const { user, loading } = useAuth();
  const [expiry, setExpiry] = useState('never');
  const [albumId, setAlbumId] = useState('');
  const [filterAlbum, setFilterAlbum] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [justUploaded, setJustUploaded] = useState<HostedImage[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: albums } = useSWR<{ data: Album[] }>(user ? `/gallery/albums?ownerId=${user.id}&limit=100` : null, fetcher);
  const mineKey = user ? `/img/mine?page=1${filterAlbum ? `&albumId=${filterAlbum}` : ''}` : null;
  const { data: mine } = useSWR<{ data: HostedImage[] }>(mineKey, fetcher);

  if (!loading && !user) return <div className="card m-6 p-10 text-center text-ink-500">Đăng nhập để dùng kho ảnh.</div>;

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setErr(''); setBusy(true);
    const done: HostedImage[] = [];
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('expiry', expiry);
        if (albumId) form.append('albumId', albumId);
        const res = await fetch(`${base}/api/img/upload`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: form });
        const body = JSON.parse(await res.text());
        if (!res.ok) throw new Error(body?.message || 'Tải lên thất bại');
        done.push(body);
      }
      setJustUploaded((p) => [...done, ...p]);
      mutate(mineKey);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function createAlbum() {
    const title = prompt('Tên album:');
    if (!title?.trim()) return;
    await api.post('/gallery/albums', { title: title.trim() });
    mutate(`/gallery/albums?ownerId=${user!.id}&limit=100`);
  }
  async function del(id: string) {
    if (!confirm('Xoá ảnh này?')) return;
    await api.del(`/img/${id}`);
    setJustUploaded((p) => p.filter((i) => i.id !== id));
    mutate(mineKey);
  }

  return (
    <div className="space-y-5">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-r from-brand-700 to-brand-600 p-6 text-white shadow-card">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><ImagePlus /> Up ảnh</h1>
        <p className="mt-1 text-white/85">Tải ảnh lên, hẹn giờ tự xoá, lấy mã nhúng & gom vào album.</p>
      </header>

      {/* Khu tải lên */}
      <div className="card space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-sm">Tự động xoá
            <select className="input mt-1" value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              {EXPIRY.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="block text-sm">Thêm vào album
            <div className="mt-1 flex gap-1">
              <select className="input flex-1" value={albumId} onChange={(e) => setAlbumId(e.target.value)}>
                <option value="">— Không —</option>
                {albums?.data?.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
              <button onClick={createAlbum} className="btn-outline shrink-0 px-2" title="Tạo album"><FolderPlus size={16} /></button>
            </div>
          </label>
        </div>

        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-300 p-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40 dark:border-ink-700 dark:hover:bg-ink-800/40">
          <UploadCloud size={36} className="text-brand-500" />
          <span className="font-medium">{busy ? 'Đang tải lên…' : 'Chạm để chọn ảnh hoặc kéo thả vào đây'}</span>
          <span className="text-xs text-ink-400">PNG, JPEG, GIF, WEBP · tối đa 20MB · chọn nhiều ảnh được</span>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
        </label>
        {err && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-600 dark:bg-rose-900/30">{err}</p>}
      </div>

      {/* Vừa tải lên — hiện mã nhúng đầy đủ */}
      {justUploaded.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-emerald-600">Vừa tải lên ({justUploaded.length})</h2>
          {justUploaded.map((img) => (
            <div key={img.id} className="card flex flex-col gap-3 p-4 sm:flex-row">
              <a href={img.url} target="_blank" rel="noreferrer" className="shrink-0">
                <img src={img.url} alt="" className="h-28 w-28 rounded-lg border border-ink-200 object-cover dark:border-ink-700" />
              </a>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs text-ink-500">
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {expiryText(img.expiresAt)}</span>
                  <button onClick={() => del(img.id)} className="inline-flex items-center gap-1 text-rose-500 hover:underline"><Trash2 size={13} /> Xoá</button>
                </div>
                <EmbedBox embeds={img.embeds} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ảnh của tôi */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Ảnh của tôi</h2>
          <select className="input w-auto text-sm" value={filterAlbum} onChange={(e) => setFilterAlbum(e.target.value)}>
            <option value="">Tất cả album</option>
            {albums?.data?.map((a) => <option key={a.id} value={a.id}>{a.title} ({a.mediaCount})</option>)}
          </select>
        </div>
        {!mine?.data?.length ? <p className="py-6 text-center text-sm text-ink-500">Chưa có ảnh nào.</p> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {mine.data.map((img) => (
              <div key={img.id} className="group relative overflow-hidden rounded-xl border border-ink-200 dark:border-ink-700">
                <a href={img.url} target="_blank" rel="noreferrer"><img src={img.url} alt="" className="aspect-square w-full object-cover" /></a>
                <div className="absolute right-1 top-1 flex gap-1">
                  <button onClick={() => { navigator.clipboard.writeText(img.url); }} title="Copy link" className="rounded-md bg-black/55 p-1.5 text-white hover:bg-black/75"><Link2 size={13} /></button>
                  <button onClick={() => del(img.id)} title="Xoá" className="rounded-md bg-black/55 p-1.5 text-white hover:bg-rose-600"><X size={13} /></button>
                </div>
                {img.expiresAt && <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">⏳</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
