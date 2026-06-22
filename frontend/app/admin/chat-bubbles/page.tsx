'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Coins, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import { cssToStyle } from '@/lib/nameEffect';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface ChatBubble {
  id: string; slug: string; name: string; description?: string | null; css: string;
  isActive: boolean; sortOrder: number;
  priceCoin?: number | null; coinDays?: number | null; priceGem?: number | null; gemDays?: number | null;
}

const emptyForm = { slug: '', name: '', description: '', css: '', priceCoin: '', coinDays: '', priceGem: '', gemDays: '', sortOrder: '0' };
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
const dur = (d?: number | null) => (d == null ? 'vĩnh viễn' : `${d} ngày`);

const SAMPLE = 'background: linear-gradient(135deg,#6366f1,#a855f7); color:#fff; border:1px solid #c4b5fd;';

export default function AdminChatBubbles() {
  const [effects, setEffects] = useState<ChatBubble[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function load() { api.get<ChatBubble[]>('/admin/chat-bubbles').then(setEffects).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr(''); setMsg('');
    if (!form.slug.trim() || !form.name.trim() || !form.css.trim()) { setErr('Nhập slug, tên và CSS bong bóng'); return; }
    if (form.priceCoin.trim() === '' && form.priceGem.trim() === '') { setErr('Phải có ít nhất 1 giá (Xu hoặc Gem)'); return; }
    try {
      await api.post('/admin/chat-bubbles', {
        slug: form.slug.trim(), name: form.name.trim(), description: form.description, css: form.css.trim(),
        priceCoin: numOrNull(form.priceCoin), coinDays: numOrNull(form.coinDays),
        priceGem: numOrNull(form.priceGem), gemDays: numOrNull(form.gemDays),
        sortOrder: Number(form.sortOrder) || 0,
      });
      setMsg('Đã tạo bong bóng ✓'); setForm(emptyForm); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function toggle(ef: ChatBubble) {
    try { await api.patch(`/admin/chat-bubbles/${ef.id}`, { isActive: !ef.isActive }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function del(ef: ChatBubble) {
    if (!confirm(`Xoá bong bóng "${ef.name}"?`)) return;
    try { await api.post(`/admin/chat-bubbles/${ef.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<MessageCircle size={20} />} title="Bong bóng chat" desc="CSS áp lên bong bóng tin nhắn chat (nền, viền, màu chữ…), bán bằng Xu hoặc Gem." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-4">
        <SectionTitle hint="Nhập khai báo CSS áp lên bong bóng chat. Dùng được background (gradient), border, color, box-shadow…">Tạo bong bóng mới</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Slug (định danh)"><input className="input" placeholder="vd: cau-vong" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Tên bong bóng"><input className="input" placeholder="vd: Cầu vồng" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mô tả" className="sm:col-span-2"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>

        <Field label="CSS bong bóng">
          <textarea className="input font-mono text-xs" rows={4} placeholder={SAMPLE} value={form.css} onChange={(e) => setForm({ ...form, css: e.target.value })} />
        </Field>
        <button type="button" onClick={() => setForm((f) => ({ ...f, css: SAMPLE }))} className="text-xs text-brand-600 hover:underline">Dùng mẫu gradient tím</button>

        <div className="rounded-xl border border-ink-200/70 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-800/50">
          <p className="mb-2 text-xs text-ink-400">Xem trước</p>
          <div className="flex justify-end">
            <span className="inline-block max-w-[78%] rounded-2xl px-3 py-2 text-sm" style={cssToStyle(form.css || SAMPLE)}>Tin nhắn ví dụ trong chat 👋</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Giá Xu (trống = không bán)"><input className="input" type="number" value={form.priceCoin} onChange={(e) => setForm({ ...form, priceCoin: e.target.value })} /></Field>
          <Field label="Hạn Xu (ngày, trống = vĩnh viễn)"><input className="input" type="number" value={form.coinDays} onChange={(e) => setForm({ ...form, coinDays: e.target.value })} /></Field>
          <Field label="Giá Gem (trống = không bán)"><input className="input" type="number" value={form.priceGem} onChange={(e) => setForm({ ...form, priceGem: e.target.value })} /></Field>
          <Field label="Hạn Gem (ngày, trống = vĩnh viễn)"><input className="input" type="number" value={form.gemDays} onChange={(e) => setForm({ ...form, gemDays: e.target.value })} /></Field>
        </div>
        <Field label="Thứ tự" className="w-32"><input className="input" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} /></Field>

        <Btn onClick={create}>Tạo bong bóng</Btn>
      </Card>

      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Các bong bóng hiện có ({effects.length})</h2>
        {effects.length === 0 && <Card><Empty icon={<MessageCircle size={28} />} title="Chưa có bong bóng nào" /></Card>}
        {effects.map((ef) => (
          <Card key={ef.id} className={!ef.isActive ? 'opacity-60' : ''}>
            <div className="flex items-center gap-3">
              <span className="shrink-0 rounded-2xl px-3 py-1.5 text-sm" style={cssToStyle(ef.css)}>{ef.name}</span>
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
