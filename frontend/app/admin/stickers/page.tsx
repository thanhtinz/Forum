'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Package, Upload, Loader2, ImagePlus } from 'lucide-react';
import { unzipSync } from 'fflate';
import { api, uploadImage } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface Sticker { id: string; name: string; imageUrl: string }
interface Pack {
  id: string; slug: string; name: string; description?: string; thumbnailUrl?: string;
  isPremium: boolean; priceCoin?: number | null; priceGem?: number | null; isActive: boolean;
  stickers: Sticker[]; _count?: { stickers: number };
}

const emptyForm = { slug: '', name: '', description: '', isPremium: false, priceCoin: 0, priceGem: 0 };
const IMG_RE = /\.(png|jpe?g|gif|webp)$/i;
const mimeOf = (n: string) => n.toLowerCase().endsWith('.png') ? 'image/png' : n.toLowerCase().endsWith('.gif') ? 'image/gif' : n.toLowerCase().endsWith('.webp') ? 'image/webp' : 'image/jpeg';

export default function AdminStickers() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [staged, setStaged] = useState<{ name: string; imageUrl: string }[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [zipBusy, setZipBusy] = useState('');
  const zipRef = useRef<HTMLInputElement>(null);

  function load() { api.get<Pack[]>('/admin/stickers').then(setPacks).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  // Tải nguyên file .zip → giải nén ngay trên trình duyệt → upload từng ảnh
  async function onZip(file: File) {
    setErr(''); setMsg('');
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const entries = unzipSync(buf);
      const names = Object.keys(entries).filter((n) => IMG_RE.test(n) && !n.includes('__MACOSX') && !n.endsWith('/'));
      if (names.length === 0) { setErr('File zip không có ảnh (png/jpg/gif/webp).'); return; }
      // gợi ý tên/slug từ tên file zip nếu chưa nhập
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
    if (staged.length === 0) { setErr('Tải lên file zip hoặc thêm ảnh sticker'); return; }
    try {
      await api.post('/admin/stickers', {
        slug: form.slug.trim(), name: form.name.trim(), description: form.description,
        isPremium: form.isPremium,
        priceCoin: form.isPremium ? Number(form.priceCoin) || 0 : 0,
        priceGem: form.isPremium ? Number(form.priceGem) || 0 : 0,
        stickers: staged,
      });
      setMsg('Đã tạo pack sticker ✓'); setForm(emptyForm); setStaged([]); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function delPack(p: Pack) {
    if (!confirm(`Ẩn pack "${p.name}"?`)) return;
    try { await api.post(`/admin/stickers/${p.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }
  async function addSticker(packId: string, imageUrl: string) {
    try { await api.post(`/admin/stickers/${packId}/add`, { name: 'sticker', imageUrl }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function delSticker(id: string) {
    try { await api.post(`/admin/stickers/sticker/${id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Package size={20} />} title="Sticker chat" desc="Tải lên cả pack bằng file .zip, hoặc thêm từng ảnh." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      {/* Tạo pack mới */}
      <Card className="space-y-4">
        <SectionTitle hint="Cách nhanh nhất: nén tất cả ảnh sticker thành 1 file .zip rồi tải lên.">Tạo pack mới</SectionTitle>

        {/* Tải zip */}
        <div className="rounded-xl border-2 border-dashed border-ink-300 p-4 text-center dark:border-ink-700">
          <input ref={zipRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => e.target.files?.[0] && onZip(e.target.files[0])} />
          <ImagePlus className="mx-auto mb-1 text-ink-400" size={26} />
          <p className="text-sm font-medium">Tải lên file .zip chứa ảnh sticker</p>
          <p className="mb-2 text-xs text-ink-400">Hỗ trợ PNG/JPG/GIF/WEBP — giải nén & upload tự động.</p>
          <Btn variant="outline" size="sm" disabled={!!zipBusy} onClick={() => zipRef.current?.click()}>
            {zipBusy ? <><Loader2 size={14} className="animate-spin" /> {zipBusy}</> : <><Upload size={14} /> Chọn file .zip</>}
          </Btn>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Slug (định danh)"><input className="input" placeholder="vd: meo-cute" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Tên pack"><input className="input" placeholder="vd: Mèo dễ thương" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mô tả" className="sm:col-span-2"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} /> Premium (phải mua)</label>
          {form.isPremium && (
            <>
              <label className="flex items-center gap-1">Giá Xu <input type="number" className="input w-24 !py-1" value={form.priceCoin} onChange={(e) => setForm({ ...form, priceCoin: Number(e.target.value) })} /></label>
              <label className="flex items-center gap-1">Giá Gem <input type="number" className="input w-24 !py-1" value={form.priceGem} onChange={(e) => setForm({ ...form, priceGem: Number(e.target.value) })} /></label>
            </>
          )}
        </div>

        {/* Ảnh đã nạp */}
        <div>
          <p className="mb-1.5 text-sm font-medium">Ảnh trong pack ({staged.length})</p>
          <div className="flex flex-wrap gap-2">
            {staged.map((s, i) => (
              <div key={i} className="relative">
                <img src={s.imageUrl} alt="" className="h-16 w-16 rounded-lg border border-ink-200 object-contain dark:border-ink-700" />
                <button onClick={() => setStaged((l) => l.filter((_, idx) => idx !== i))} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white"><Trash2 size={11} /></button>
              </div>
            ))}
            <div className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-ink-300 dark:border-ink-700">
              <ImageUpload label="" onUploaded={(url) => setStaged((l) => [...l, { name: 'sticker', imageUrl: url }])} />
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
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <span className="font-semibold">{p.name}</span>
                <span className="ml-1 text-xs text-ink-400">/{p.slug} · {p._count?.stickers ?? p.stickers.length} sticker · {p.isPremium ? `Premium (${p.priceGem || 0} gem)` : 'Miễn phí'}{!p.isActive ? ' · (ẩn)' : ''}</span>
              </div>
              <Btn variant="danger" size="sm" onClick={() => delPack(p)}>Ẩn pack</Btn>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.stickers.map((s) => (
                <div key={s.id} className="relative">
                  <img src={s.imageUrl} alt={s.name} className="h-14 w-14 rounded-lg border border-ink-200 object-contain dark:border-ink-700" />
                  <button onClick={() => delSticker(s.id)} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white"><Trash2 size={11} /></button>
                </div>
              ))}
              <div className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-ink-300 dark:border-ink-700">
                <ImageUpload label="" onUploaded={(url) => addSticker(p.id, url)} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
