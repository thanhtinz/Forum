'use client';

import { useEffect, useState } from 'react';
import { Award, Coins, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface BadgeProduct {
  id: string; slug: string; name: string; description?: string | null; imageUrl: string;
  isActive: boolean; sortOrder: number;
  priceCoin?: number | null; coinDays?: number | null; priceGem?: number | null; gemDays?: number | null;
}

const emptyForm = { slug: '', name: '', description: '', imageUrl: '', priceCoin: '', coinDays: '', priceGem: '', gemDays: '', sortOrder: '0' };
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
const dur = (d?: number | null) => (d == null ? 'vĩnh viễn' : `${d} ngày`);

export default function AdminShopBadges() {
  const [badges, setBadges] = useState<BadgeProduct[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function load() { api.get<BadgeProduct[]>('/admin/badge-products').then(setBadges).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr(''); setMsg('');
    if (!form.slug.trim() || !form.name.trim() || !form.imageUrl) { setErr('Nhập slug, tên và ảnh badge'); return; }
    if (form.priceCoin.trim() === '' && form.priceGem.trim() === '') { setErr('Phải có ít nhất 1 giá (Xu hoặc Gem)'); return; }
    try {
      await api.post('/admin/badge-products', {
        slug: form.slug.trim(), name: form.name.trim(), description: form.description, imageUrl: form.imageUrl,
        priceCoin: numOrNull(form.priceCoin), coinDays: numOrNull(form.coinDays),
        priceGem: numOrNull(form.priceGem), gemDays: numOrNull(form.gemDays),
        sortOrder: Number(form.sortOrder) || 0,
      });
      setMsg('Đã tạo badge ✓'); setForm(emptyForm); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function toggle(b: BadgeProduct) {
    try { await api.patch(`/admin/badge-products/${b.id}`, { isActive: !b.isActive }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function del(b: BadgeProduct) {
    if (!confirm(`Xoá badge "${b.name}"?`)) return;
    try { await api.post(`/admin/badge-products/${b.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Award size={20} />} title="Badge trang trí" desc="Badge dạng ảnh bán bằng Xu hoặc Gem, đeo cạnh tên. Mỗi loại tiền có thời hạn riêng." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-4">
        <SectionTitle hint="Ảnh badge nên là PNG nền trong suốt, vuông.">Tạo badge mới</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Slug (định danh)"><input className="input" placeholder="vd: badge-kim-cuong" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Tên badge"><input className="input" placeholder="vd: Kim Cương" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mô tả" className="sm:col-span-2"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>

        <div className="flex items-center gap-3">
          {form.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={form.imageUrl} alt="" className="h-20 w-20 rounded-lg border border-ink-200 object-contain dark:border-ink-700" />
            : <span className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-ink-300 text-ink-400 dark:border-ink-700"><Award /></span>}
          <ImageUpload label="Tải ảnh badge" onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Giá Xu (trống = không bán)"><input className="input" type="number" value={form.priceCoin} onChange={(e) => setForm({ ...form, priceCoin: e.target.value })} /></Field>
          <Field label="Hạn Xu (ngày, trống = vĩnh viễn)"><input className="input" type="number" value={form.coinDays} onChange={(e) => setForm({ ...form, coinDays: e.target.value })} /></Field>
          <Field label="Giá Gem (trống = không bán)"><input className="input" type="number" value={form.priceGem} onChange={(e) => setForm({ ...form, priceGem: e.target.value })} /></Field>
          <Field label="Hạn Gem (ngày, trống = vĩnh viễn)"><input className="input" type="number" value={form.gemDays} onChange={(e) => setForm({ ...form, gemDays: e.target.value })} /></Field>
        </div>
        <Field label="Thứ tự" className="w-32"><input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>

        <Btn onClick={create}>Tạo badge</Btn>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Các badge hiện có ({badges.length})</h2>
        {badges.length === 0 && <Card><Empty icon={<Award size={28} />} title="Chưa có badge nào" /></Card>}
        {badges.map((b) => (
          <Card key={b.id} className={!b.isActive ? 'opacity-60' : ''}>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={b.name} className="h-16 w-16 shrink-0 rounded-lg border border-ink-200 object-contain dark:border-ink-700" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{b.name} <span className="text-xs font-normal text-ink-400">/{b.slug}{!b.isActive ? ' · (ẩn)' : ''}</span></p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-500">
                  {b.priceCoin != null && <span className="inline-flex items-center gap-1"><Coins size={12} /> {b.priceCoin} Xu · {dur(b.coinDays)}</span>}
                  {b.priceGem != null && <span className="inline-flex items-center gap-1 text-fuchsia-600"><Gem size={12} /> {b.priceGem} Gem · {dur(b.gemDays)}</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Btn variant="outline" size="sm" onClick={() => toggle(b)}>{b.isActive ? 'Ẩn' : 'Hiện'}</Btn>
                <Btn variant="danger" size="sm" onClick={() => del(b)}>Xoá</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
