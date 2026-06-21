'use client';

import { useEffect, useState } from 'react';
import { Square, Coins, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface Frame {
  id: string; slug: string; name: string; description?: string | null; imageUrl: string;
  isActive: boolean; sortOrder: number;
  priceCoin?: number | null; coinDays?: number | null; priceGem?: number | null; gemDays?: number | null;
}

const emptyForm = { slug: '', name: '', description: '', imageUrl: '', priceCoin: '', coinDays: '', priceGem: '', gemDays: '', sortOrder: '0' };
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
const dur = (d?: number | null) => (d == null ? 'vĩnh viễn' : `${d} ngày`);

export default function AdminFrames() {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function load() { api.get<Frame[]>('/admin/frames').then(setFrames).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr(''); setMsg('');
    if (!form.slug.trim() || !form.name.trim() || !form.imageUrl) { setErr('Nhập slug, tên và ảnh khung'); return; }
    if (form.priceCoin.trim() === '' && form.priceGem.trim() === '') { setErr('Phải có ít nhất 1 giá (Xu hoặc Gem)'); return; }
    try {
      await api.post('/admin/frames', {
        slug: form.slug.trim(), name: form.name.trim(), description: form.description, imageUrl: form.imageUrl,
        priceCoin: numOrNull(form.priceCoin), coinDays: numOrNull(form.coinDays),
        priceGem: numOrNull(form.priceGem), gemDays: numOrNull(form.gemDays),
        sortOrder: Number(form.sortOrder) || 0,
      });
      setMsg('Đã tạo khung ✓'); setForm(emptyForm); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function toggle(f: Frame) {
    try { await api.patch(`/admin/frames/${f.id}`, { isActive: !f.isActive }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function del(f: Frame) {
    if (!confirm(`Xoá khung "${f.name}"?`)) return;
    try { await api.post(`/admin/frames/${f.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Square size={20} />} title="Khung avatar" desc="Sản phẩm khung bán bằng Xu hoặc Gem, mỗi loại tiền có thời hạn riêng (vd: Xu vài ngày, Gem vĩnh viễn)." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-4">
        <SectionTitle hint="Ảnh khung nên là PNG nền trong suốt, phần giữa rỗng để lộ avatar.">Tạo khung mới</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Slug (định danh)"><input className="input" placeholder="vd: khung-rong" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Tên khung"><input className="input" placeholder="vd: Khung Rồng" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mô tả" className="sm:col-span-2"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>

        <div className="flex items-center gap-3">
          {form.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={form.imageUrl} alt="" className="h-20 w-20 rounded-lg border border-ink-200 object-contain dark:border-ink-700" />
            : <span className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-ink-300 text-ink-400 dark:border-ink-700"><Square /></span>}
          <ImageUpload label="Tải ảnh khung" onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Giá Xu (trống = không bán)"><input className="input" type="number" value={form.priceCoin} onChange={(e) => setForm({ ...form, priceCoin: e.target.value })} /></Field>
          <Field label="Hạn Xu (ngày, trống = vĩnh viễn)"><input className="input" type="number" value={form.coinDays} onChange={(e) => setForm({ ...form, coinDays: e.target.value })} /></Field>
          <Field label="Giá Gem (trống = không bán)"><input className="input" type="number" value={form.priceGem} onChange={(e) => setForm({ ...form, priceGem: e.target.value })} /></Field>
          <Field label="Hạn Gem (ngày, trống = vĩnh viễn)"><input className="input" type="number" value={form.gemDays} onChange={(e) => setForm({ ...form, gemDays: e.target.value })} /></Field>
        </div>
        <Field label="Thứ tự" className="w-32"><input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>

        <Btn onClick={create}>Tạo khung</Btn>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Các khung hiện có ({frames.length})</h2>
        {frames.length === 0 && <Card><Empty icon={<Square size={28} />} title="Chưa có khung nào" /></Card>}
        {frames.map((f) => (
          <Card key={f.id} className={!f.isActive ? 'opacity-60' : ''}>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.imageUrl} alt={f.name} className="h-16 w-16 shrink-0 rounded-lg border border-ink-200 object-contain dark:border-ink-700" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{f.name} <span className="text-xs font-normal text-ink-400">/{f.slug}{!f.isActive ? ' · (ẩn)' : ''}</span></p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-500">
                  {f.priceCoin != null && <span className="inline-flex items-center gap-1"><Coins size={12} /> {f.priceCoin} Xu · {dur(f.coinDays)}</span>}
                  {f.priceGem != null && <span className="inline-flex items-center gap-1 text-fuchsia-600"><Gem size={12} /> {f.priceGem} Gem · {dur(f.gemDays)}</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Btn variant="outline" size="sm" onClick={() => toggle(f)}>{f.isActive ? 'Ẩn' : 'Hiện'}</Btn>
                <Btn variant="danger" size="sm" onClick={() => del(f)}>Xoá</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
