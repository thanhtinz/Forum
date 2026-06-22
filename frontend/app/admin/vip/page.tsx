'use client';

import { useEffect, useState } from 'react';
import { Crown, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface Tier {
  id: string; name: string; gemRequired: number; badgeUrl?: string | null; frameUrl?: string | null;
  color?: string | null; sortOrder: number; isActive: boolean;
}

const empty = { name: '', gemRequired: '', badgeUrl: '', frameUrl: '', color: '', sortOrder: '0' };

export default function AdminVip() {
  const [list, setList] = useState<Tier[]>([]);
  const [form, setForm] = useState<typeof empty>(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function load() { api.get<Tier[]>('/admin/vip').then(setList).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  function startEdit(t: Tier) {
    setEditId(t.id);
    setForm({ name: t.name, gemRequired: String(t.gemRequired), badgeUrl: t.badgeUrl || '', frameUrl: t.frameUrl || '', color: t.color || '', sortOrder: String(t.sortOrder) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function cancelEdit() { setEditId(null); setForm(empty); }

  async function save() {
    setErr(''); setMsg('');
    if (!form.name.trim() || form.gemRequired === '') { setErr('Nhập tên mốc và số gem yêu cầu'); return; }
    const payload = {
      name: form.name.trim(), gemRequired: Number(form.gemRequired) || 0,
      badgeUrl: form.badgeUrl || null, frameUrl: form.frameUrl || null,
      color: form.color || null, sortOrder: Number(form.sortOrder) || 0,
    };
    try {
      if (editId) { await api.patch(`/admin/vip/${editId}`, payload); setMsg('Đã lưu mốc VIP ✓'); }
      else { await api.post('/admin/vip', payload); setMsg('Đã tạo mốc VIP ✓'); }
      setForm(empty); setEditId(null); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function toggle(t: Tier) {
    try { await api.patch(`/admin/vip/${t.id}`, { isActive: !t.isActive }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function del(t: Tier) {
    if (!confirm(`Xoá mốc "${t.name}"?`)) return;
    try { await api.post(`/admin/vip/${t.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }
  async function recomputeAll() {
    setErr(''); setMsg('');
    if (!confirm('Tính lại VIP cho toàn bộ user theo gem nạp tích lũy? Áp dụng ngay.')) return;
    try {
      const r = await api.post<{ scanned: number; updated: number }>('/admin/vip/recompute-all');
      setMsg(`Đã tính lại VIP: quét ${r.scanned} user, cập nhật ${r.updated} user ✓`);
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<Crown size={20} />} title="Hệ thống VIP" desc="Tạo mốc theo gem nạp tích lũy. User đạt mốc tự nhận badge + khung avatar VIP. (Không seed — admin tự tạo.)" />
      <div className="flex justify-end">
        <Btn variant="outline" onClick={recomputeAll}>Tính lại VIP toàn bộ</Btn>
      </div>
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-4">
        <SectionTitle hint="Mốc dựa trên TỔNG gem đã nạp (tích lũy), không phải số dư hiện tại.">{editId ? 'Sửa mốc VIP' : 'Tạo mốc VIP'}</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tên mốc (vd: VIP Bạc)"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Gem nạp tích lũy yêu cầu"><input type="number" className="input" value={form.gemRequired} onChange={(e) => setForm({ ...form, gemRequired: e.target.value })} /></Field>
          <Field label="Màu tên (tuỳ chọn, mã hex)"><input className="input" placeholder="#f59e0b" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
          <Field label="Thứ tự"><input type="number" className="input" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3">
            {form.badgeUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={form.badgeUrl} alt="" className="h-14 w-14 rounded-lg border border-ink-200 object-contain dark:border-ink-700" />
              : <span className="grid h-14 w-14 place-items-center rounded-lg border border-dashed border-ink-300 text-ink-400 dark:border-ink-700"><Crown size={18} /></span>}
            <ImageUpload label="Tải badge VIP" onUploaded={(url) => setForm((f) => ({ ...f, badgeUrl: url }))} />
          </div>
          <div className="flex items-center gap-3">
            {form.frameUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={form.frameUrl} alt="" className="h-14 w-14 rounded-full border border-ink-200 object-contain dark:border-ink-700" />
              : <span className="grid h-14 w-14 place-items-center rounded-full border border-dashed border-ink-300 text-ink-400 dark:border-ink-700">khung</span>}
            <ImageUpload label="Tải khung avatar VIP" onUploaded={(url) => setForm((f) => ({ ...f, frameUrl: url }))} />
          </div>
        </div>
        <div className="flex gap-2">
          <Btn onClick={save}>{editId ? 'Lưu thay đổi' : 'Tạo mốc'}</Btn>
          {editId && <Btn variant="outline" onClick={cancelEdit}>Huỷ</Btn>}
        </div>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Các mốc hiện có ({list.length})</h2>
        {list.length === 0 && <Card><Empty icon={<Crown size={28} />} title="Chưa có mốc VIP nào" /></Card>}
        {list.map((t) => (
          <Card key={t.id} className={!t.isActive ? 'opacity-60' : ''}>
            <div className="flex items-center gap-3">
              {t.badgeUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={t.badgeUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-contain" />
                : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-400 dark:bg-ink-800"><Crown size={18} /></span>}
              <div className="min-w-0 flex-1">
                <p className="font-semibold" style={t.color ? { color: t.color } : undefined}>{t.name} {!t.isActive && <span className="text-xs font-normal text-ink-400">(ẩn)</span>}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-500"><Gem size={12} /> Cần nạp tích lũy ≥ {t.gemRequired} gem{t.frameUrl ? ' · có khung VIP' : ''}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Btn variant="outline" size="sm" onClick={() => startEdit(t)}>Sửa</Btn>
                <Btn variant="outline" size="sm" onClick={() => toggle(t)}>{t.isActive ? 'Ẩn' : 'Hiện'}</Btn>
                <Btn variant="danger" size="sm" onClick={() => del(t)}>Xoá</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
