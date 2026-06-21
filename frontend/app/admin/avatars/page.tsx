'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Package, Upload, Loader2, ImagePlus } from 'lucide-react';
import { unzipSync } from 'fflate';
import { api, uploadImage } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface AvatarImg { id: string; name: string; imageUrl: string }
interface Pack {
  id: string; slug: string; name: string; description?: string; thumbnailUrl?: string;
  isActive: boolean; avatars: AvatarImg[]; _count?: { avatars: number };
}

const emptyForm = { slug: '', name: '', description: '' };
const IMG_RE = /\.(png|jpe?g|gif|webp)$/i;
const mimeOf = (n: string) => n.toLowerCase().endsWith('.png') ? 'image/png' : n.toLowerCase().endsWith('.gif') ? 'image/gif' : n.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';

export default function AdminAvatars() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [staged, setStaged] = useState<{ name: string; imageUrl: string }[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [zipBusy, setZipBusy] = useState('');
  const zipRef = useRef<HTMLInputElement>(null);

  function load() { api.get<Pack[]>('/admin/avatars').then(setPacks).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  // Tải nguyên file .zip → giải nén ngay trên trình duyệt → upload từng ảnh
  async function onZip(file: File) {
    setErr(''); setMsg('');
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const entries = unzipSync(buf);
      const names = Object.keys(entries).filter((n) => IMG_RE.test(n) && !n.includes('__MACOSX') && !n.endsWith('/'));
      if (names.length === 0) { setErr('File zip không có ảnh (png/jpg/gif/webp).'); return; }
      const base = file.name.replace(/\.zip$/i, '');
      setForm((f) => ({ ...f, slug: f.slug || base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name: f.name || base }));
      let done = 0;
      for (const n of names.sort()) {
        setZipBusy(`Đang tải ${++done}/${names.length}…`);
        const short = n.split('/').pop() || n;
        const file2 = new File([new Blob([entries[n]])], short, { type: mimeOf(short) });
        const r = await uploadImage(file2);
        setStaged((l) => [...l, { name: short.replace(IMG_RE, ''), imageUrl: r.url }]);
      }
      setMsg(`Đã nạp ${names.length} ảnh từ ${file.name}. Kiểm tra rồi bấm "Tạo pack".`);
    } catch (e: any) {
      setErr('Không đọc được file zip: ' + (e?.message || 'lỗi'));
    } finally {
      setZipBusy('');
      if (zipRef.current) zipRef.current.value = '';
    }
  }

  async function createPack() {
    setErr(''); setMsg('');
    if (!form.slug.trim() || !form.name.trim()) { setErr('Nhập slug và tên pack'); return; }
    if (staged.length === 0) { setErr('Tải lên file zip hoặc thêm ảnh avatar'); return; }
    try {
      await api.post('/admin/avatars', {
        slug: form.slug.trim(), name: form.name.trim(), description: form.description,
        avatars: staged,
      });
      setMsg('Đã tạo pack avatar ✓'); setForm(emptyForm); setStaged([]); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function delPack(p: Pack) {
    if (!confirm(`Xoá pack "${p.name}"?`)) return;
    try { await api.post(`/admin/avatars/${p.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }
  async function toggleActive(p: Pack) {
    try { await api.patch(`/admin/avatars/${p.id}`, { isActive: !p.isActive }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function addAvatar(packId: string, imageUrl: string) {
    try { await api.post(`/admin/avatars/${packId}/add`, { imageUrl }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function delAvatar(id: string) {
    try { await api.post(`/admin/avatars/image/${id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Package size={20} />} title="Thư viện avatar" desc="Pack ảnh đại diện sẵn cho user chọn. Tải cả pack bằng file .zip hoặc thêm từng ảnh." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      {/* Tạo pack mới */}
      <Card className="space-y-4">
        <SectionTitle hint="Cách nhanh nhất: nén tất cả ảnh avatar thành 1 file .zip rồi tải lên.">Tạo pack mới</SectionTitle>

        <div className="rounded-xl border-2 border-dashed border-ink-300 p-4 text-center dark:border-ink-700">
          <input ref={zipRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => e.target.files?.[0] && onZip(e.target.files[0])} />
          <ImagePlus className="mx-auto mb-1 text-ink-400" size={26} />
          <p className="text-sm font-medium">Tải lên file .zip chứa ảnh avatar</p>
          <p className="mb-2 text-xs text-ink-400">Hỗ trợ PNG/JPG/GIF/WEBP — giải nén & upload tự động.</p>
          <Btn variant="outline" size="sm" disabled={!!zipBusy} onClick={() => zipRef.current?.click()}>
            {zipBusy ? <><Loader2 size={14} className="animate-spin" /> {zipBusy}</> : <><Upload size={14} /> Chọn file .zip</>}
          </Btn>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Slug (định danh)"><input className="input" placeholder="vd: anime-girl" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Tên pack"><input className="input" placeholder="vd: Avatar Anime" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mô tả" className="sm:col-span-2"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>

        {/* Ảnh đã nạp */}
        <div>
          <p className="mb-1.5 text-sm font-medium">Ảnh trong pack ({staged.length})</p>
          <div className="flex flex-wrap gap-2">
            {staged.map((s, i) => (
              <div key={i} className="relative">
                <img src={s.imageUrl} alt="" className="h-16 w-16 rounded-full border border-ink-200 object-cover dark:border-ink-700" />
                <button onClick={() => setStaged((l) => l.filter((_, idx) => idx !== i))} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white"><Trash2 size={11} /></button>
              </div>
            ))}
            <div className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-ink-300 dark:border-ink-700">
              <ImageUpload label="" onUploaded={(url) => setStaged((l) => [...l, { name: 'avatar', imageUrl: url }])} />
            </div>
          </div>
        </div>

        <Btn onClick={createPack} disabled={!!zipBusy}>Tạo pack</Btn>
      </Card>

      {/* Danh sách pack */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Các pack hiện có ({packs.length})</h2>
        {packs.length === 0 && <Card><Empty icon={<Package size={28} />} title="Chưa có pack nào" /></Card>}
        {packs.map((p) => (
          <Card key={p.id} className={!p.isActive ? 'opacity-60' : ''}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="font-semibold">{p.name}</span>
                <span className="ml-1 text-xs text-ink-400">/{p.slug} · {p._count?.avatars ?? p.avatars.length} ảnh{!p.isActive ? ' · (ẩn)' : ''}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Btn variant="outline" size="sm" onClick={() => toggleActive(p)}>{p.isActive ? 'Ẩn' : 'Hiện'}</Btn>
                <Btn variant="danger" size="sm" onClick={() => delPack(p)}>Xoá</Btn>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.avatars.map((a) => (
                <div key={a.id} className="relative">
                  <img src={a.imageUrl} alt={a.name} className="h-14 w-14 rounded-full border border-ink-200 object-cover dark:border-ink-700" />
                  <button onClick={() => delAvatar(a.id)} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white"><Trash2 size={11} /></button>
                </div>
              ))}
              <div className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-ink-300 dark:border-ink-700">
                <ImageUpload label="" onUploaded={(url) => addAvatar(p.id, url)} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
