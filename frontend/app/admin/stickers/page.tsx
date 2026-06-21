'use client';

import { useEffect, useState } from 'react';
import { Trash2, Package } from 'lucide-react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';

interface Sticker { id: string; name: string; imageUrl: string }
interface Pack {
  id: string; slug: string; name: string; description?: string; thumbnailUrl?: string;
  isPremium: boolean; priceCoin?: number | null; priceGem?: number | null; isActive: boolean;
  stickers: Sticker[]; _count?: { stickers: number };
}

const emptyForm = { slug: '', name: '', description: '', isPremium: false, priceCoin: 0, priceGem: 0 };

export default function AdminStickers() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [newStickers, setNewStickers] = useState<{ name: string; imageUrl: string }[]>([]);
  const [msg, setMsg] = useState('');

  function load() { api.get<Pack[]>('/admin/stickers').then(setPacks).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);

  async function createPack() {
    if (!form.slug.trim() || !form.name.trim()) { setMsg('Nhập slug và tên pack'); return; }
    if (newStickers.length === 0) { setMsg('Tải lên ít nhất 1 ảnh sticker'); return; }
    try {
      await api.post('/admin/stickers', {
        slug: form.slug.trim(), name: form.name.trim(), description: form.description,
        isPremium: form.isPremium,
        priceCoin: form.isPremium ? Number(form.priceCoin) || 0 : 0,
        priceGem: form.isPremium ? Number(form.priceGem) || 0 : 0,
        stickers: newStickers,
      });
      setMsg('Đã tạo pack sticker ✓'); setForm(emptyForm); setNewStickers([]); load();
    } catch (e: any) { setMsg(e.message); }
  }
  async function delPack(p: Pack) {
    if (!confirm(`Ẩn pack "${p.name}"?`)) return;
    try { await api.post(`/admin/stickers/${p.id}/delete`); load(); } catch (e: any) { setMsg(e.message); }
  }
  async function addSticker(packId: string, imageUrl: string) {
    try { await api.post(`/admin/stickers/${packId}/add`, { name: 'sticker', imageUrl }); load(); } catch (e: any) { setMsg(e.message); }
  }
  async function delSticker(id: string) {
    try { await api.post(`/admin/stickers/sticker/${id}/delete`); load(); } catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Sticker chat</h1>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {/* Tạo pack mới */}
      <section className="card space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-semibold"><Package size={18} /> Tải lên pack sticker mới</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">Slug (định danh)
            <input className="input mt-1" placeholder="vd: meo-cute" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </label>
          <label className="text-sm">Tên pack
            <input className="input mt-1" placeholder="vd: Mèo dễ thương" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-sm sm:col-span-2">Mô tả
            <input className="input mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} /> Premium (phải mua)</label>
            {form.isPremium && (
              <>
                <label className="flex items-center gap-1">Giá Xu <input type="number" className="input w-24 !py-1" value={form.priceCoin} onChange={(e) => setForm({ ...form, priceCoin: Number(e.target.value) })} /></label>
                <label className="flex items-center gap-1">Giá Gem <input type="number" className="input w-24 !py-1" value={form.priceGem} onChange={(e) => setForm({ ...form, priceGem: Number(e.target.value) })} /></label>
              </>
            )}
          </div>
        </div>

        {/* Ảnh sticker */}
        <div>
          <p className="mb-1 text-sm font-medium">Ảnh sticker ({newStickers.length})</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {newStickers.map((s, i) => (
              <div key={i} className="relative">
                <img src={s.imageUrl} alt="" className="h-16 w-16 rounded-lg border border-ink-200 object-contain dark:border-ink-700" />
                <button onClick={() => setNewStickers((l) => l.filter((_, idx) => idx !== i))}
                  className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-rose-500 text-white"><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
          <ImageUpload label="Tải thêm ảnh sticker" onUploaded={(url) => setNewStickers((l) => [...l, { name: 'sticker', imageUrl: url }])} />
        </div>

        <button onClick={createPack} className="btn-primary">Tạo pack</button>
      </section>

      {/* Danh sách pack */}
      <section className="space-y-3">
        <h2 className="font-semibold">Các pack hiện có</h2>
        {packs.length === 0 && <div className="card p-6 text-center text-ink-500">Chưa có pack nào.</div>}
        {packs.map((p) => (
          <div key={p.id} className={`card p-4 ${!p.isActive ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{p.name}</span> <span className="text-xs text-ink-400">/{p.slug} · {p._count?.stickers ?? p.stickers.length} sticker {p.isPremium ? `· Premium (${p.priceGem || 0} gem)` : '· Miễn phí'}{!p.isActive ? ' · (ẩn)' : ''}</span>
              </div>
              <button onClick={() => delPack(p)} className="btn-outline !py-1 text-xs text-red-600">Ẩn pack</button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
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
          </div>
        ))}
      </section>
    </div>
  );
}
