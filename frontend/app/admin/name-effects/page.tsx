'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Coins, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import { cssToStyle } from '@/lib/nameEffect';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface NameEffect {
  id: string; slug: string; name: string; description?: string | null; css: string;
  isActive: boolean; sortOrder: number;
  priceCoin?: number | null; coinDays?: number | null; priceGem?: number | null; gemDays?: number | null;
}

const emptyForm = { slug: '', name: '', description: '', css: '', priceCoin: '', coinDays: '', priceGem: '', gemDays: '', sortOrder: '0' };
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
const dur = (d?: number | null) => (d == null ? 'vĩnh viễn' : `${d} ngày`);

const SAMPLE = 'background: linear-gradient(90deg,#f43f5e,#f59e0b,#22c55e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;';

export default function AdminNameEffects() {
  const [effects, setEffects] = useState<NameEffect[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function load() { api.get<NameEffect[]>('/admin/name-effects').then(setEffects).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr(''); setMsg('');
    if (!form.slug.trim() || !form.name.trim() || !form.css.trim()) { setErr('Nhập slug, tên và CSS hiệu ứng'); return; }
    if (form.priceCoin.trim() === '' && form.priceGem.trim() === '') { setErr('Phải có ít nhất 1 giá (Xu hoặc Gem)'); return; }
    try {
      await api.post('/admin/name-effects', {
        slug: form.slug.trim(), name: form.name.trim(), description: form.description, css: form.css.trim(),
        priceCoin: numOrNull(form.priceCoin), coinDays: numOrNull(form.coinDays),
        priceGem: numOrNull(form.priceGem), gemDays: numOrNull(form.gemDays),
        sortOrder: Number(form.sortOrder) || 0,
      });
      setMsg('Đã tạo hiệu ứng ✓'); setForm(emptyForm); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function toggle(ef: NameEffect) {
    try { await api.patch(`/admin/name-effects/${ef.id}`, { isActive: !ef.isActive }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function del(ef: NameEffect) {
    if (!confirm(`Xoá hiệu ứng "${ef.name}"?`)) return;
    try { await api.post(`/admin/name-effects/${ef.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Sparkles size={20} />} title="Hiệu ứng tên" desc="Hiệu ứng CSS áp lên tên người dùng (gradient, phát sáng…), bán bằng Xu hoặc Gem." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-4">
        <SectionTitle hint="Nhập khai báo CSS áp lên tên. Dùng được color, background gradient + -webkit-background-clip:text, text-shadow…">Tạo hiệu ứng mới</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Slug (định danh)"><input className="input" placeholder="vd: cau-vong" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Tên hiệu ứng"><input className="input" placeholder="vd: Cầu vồng" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mô tả" className="sm:col-span-2"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>

        <Field label="CSS hiệu ứng">
          <textarea className="input font-mono text-xs" rows={4} placeholder={SAMPLE} value={form.css} onChange={(e) => setForm({ ...form, css: e.target.value })} />
        </Field>
        <button type="button" onClick={() => setForm((f) => ({ ...f, css: SAMPLE }))} className="text-xs text-brand-600 hover:underline">Dùng mẫu gradient cầu vồng</button>

        <div className="rounded-xl border border-ink-200/70 bg-ink-50 p-4 text-center dark:border-ink-700 dark:bg-ink-800/50">
          <p className="mb-1 text-xs text-ink-400">Xem trước</p>
          <span className="text-2xl font-bold" style={cssToStyle(form.css || SAMPLE)}>TênNgườiDùng</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Giá Xu (trống = không bán)"><input className="input" type="number" value={form.priceCoin} onChange={(e) => setForm({ ...form, priceCoin: e.target.value })} /></Field>
          <Field label="Hạn Xu (ngày, trống = vĩnh viễn)"><input className="input" type="number" value={form.coinDays} onChange={(e) => setForm({ ...form, coinDays: e.target.value })} /></Field>
          <Field label="Giá Gem (trống = không bán)"><input className="input" type="number" value={form.priceGem} onChange={(e) => setForm({ ...form, priceGem: e.target.value })} /></Field>
          <Field label="Hạn Gem (ngày, trống = vĩnh viễn)"><input className="input" type="number" value={form.gemDays} onChange={(e) => setForm({ ...form, gemDays: e.target.value })} /></Field>
        </div>
        <Field label="Thứ tự" className="w-32"><input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>

        <Btn onClick={create}>Tạo hiệu ứng</Btn>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Các hiệu ứng hiện có ({effects.length})</h2>
        {effects.length === 0 && <Card><Empty icon={<Sparkles size={28} />} title="Chưa có hiệu ứng nào" /></Card>}
        {effects.map((ef) => (
          <Card key={ef.id} className={!ef.isActive ? 'opacity-60' : ''}>
            <div className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate text-lg font-bold" style={cssToStyle(ef.css)}>{ef.name}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{ef.name} <span className="text-xs font-normal text-ink-400">/{ef.slug}{!ef.isActive ? ' · (ẩn)' : ''}</span></p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-ink-500">
                  {ef.priceCoin != null && <span className="inline-flex items-center gap-1"><Coins size={12} /> {ef.priceCoin} Xu · {dur(ef.coinDays)}</span>}
                  {ef.priceGem != null && <span className="inline-flex items-center gap-1 text-fuchsia-600"><Gem size={12} /> {ef.priceGem} Gem · {dur(ef.gemDays)}</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Btn variant="outline" size="sm" onClick={() => toggle(ef)}>{ef.isActive ? 'Ẩn' : 'Hiện'}</Btn>
                <Btn variant="danger" size="sm" onClick={() => del(ef)}>Xoá</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
