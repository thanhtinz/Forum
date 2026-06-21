'use client';

import { useEffect, useState } from 'react';
import { Megaphone, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface Banner {
  id: string; title: string; imageUrl: string; linkUrl?: string | null;
  position: string; startAt?: string | null; endAt?: string | null; isActive: boolean; sortOrder: number;
}

const POSITIONS = [
  { key: 'home_top', label: 'Trang chủ (ngang trên cùng)' },
  { key: 'sidebar', label: 'Thanh bên (sidebar)' },
];
const empty = { title: '', imageUrl: '', linkUrl: '', position: 'home_top', startAt: '', endAt: '', sortOrder: '0' };
const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString('vi') : '—');

export default function AdminBanners() {
  const [list, setList] = useState<Banner[]>([]);
  const [form, setForm] = useState<typeof empty>(empty);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function load() { api.get<Banner[]>('/admin/banners').then(setList).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr(''); setMsg('');
    if (!form.title.trim() || !form.imageUrl) { setErr('Nhập tiêu đề và ảnh banner'); return; }
    try {
      await api.post('/admin/banners', {
        title: form.title.trim(), imageUrl: form.imageUrl, linkUrl: form.linkUrl.trim() || null,
        position: form.position,
        startAt: form.startAt || null, endAt: form.endAt || null,
        sortOrder: Number(form.sortOrder) || 0,
      });
      setMsg('Đã tạo banner ✓'); setForm(empty); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function toggle(b: Banner) {
    try { await api.patch(`/admin/banners/${b.id}`, { isActive: !b.isActive }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function del(b: Banner) {
    if (!confirm(`Xoá banner "${b.title}"?`)) return;
    try { await api.post(`/admin/banners/${b.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Megaphone size={20} />} title="Banner quảng cáo" desc="Gắn banner theo vị trí và khoảng thời gian. Vị trí nào chưa có banner hiệu lực sẽ tự hiện ô 'cho thuê quảng cáo'." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-4">
        <SectionTitle hint="Ảnh ngang đẹp nhất cho home_top (~1200×240); sidebar dùng ảnh vuông/đứng.">Tạo banner</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tiêu đề (nội bộ)"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Vị trí">
            <select className="input" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })}>
              {POSITIONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Link khi bấm (tuỳ chọn)" className="sm:col-span-2"><input className="input" placeholder="https://…" value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} /></Field>
          <Field label="Bắt đầu hiển thị (trống = ngay)"><input type="datetime-local" className="input" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} /></Field>
          <Field label="Kết thúc (trống = vô hạn)"><input type="datetime-local" className="input" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} /></Field>
          <Field label="Thứ tự" className="w-32"><input type="number" className="input" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>
        </div>
        <div className="flex items-center gap-3">
          {form.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={form.imageUrl} alt="" className="h-20 w-40 rounded-lg border border-ink-200 object-cover dark:border-ink-700" />
            : <span className="grid h-20 w-40 place-items-center rounded-lg border border-dashed border-ink-300 text-ink-400 dark:border-ink-700"><Megaphone /></span>}
          <ImageUpload label="Tải ảnh banner" onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
        </div>
        <Btn onClick={create}>Tạo banner</Btn>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Banner hiện có ({list.length})</h2>
        {list.length === 0 && <Card><Empty icon={<Megaphone size={28} />} title="Chưa có banner nào" /></Card>}
        {list.map((b) => (
          <Card key={b.id} className={!b.isActive ? 'opacity-60' : ''}>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt={b.title} className="h-16 w-28 shrink-0 rounded-lg border border-ink-200 object-cover dark:border-ink-700" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{b.title} <span className="text-xs font-normal text-ink-400">· {POSITIONS.find((p) => p.key === b.position)?.label || b.position}{!b.isActive ? ' · (ẩn)' : ''}</span></p>
                <p className="mt-0.5 text-xs text-ink-500">Hiển thị: {fmt(b.startAt)} → {fmt(b.endAt)}</p>
                {b.linkUrl && <a href={b.linkUrl} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"><ExternalLink size={11} /> {b.linkUrl}</a>}
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
