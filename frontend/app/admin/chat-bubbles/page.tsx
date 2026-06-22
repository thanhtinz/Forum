'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, Coins, Gem } from 'lucide-react';
import { api } from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';
import { PageHeader, Card, SectionTitle, Notice, Btn, Field, Empty } from '@/components/admin/ui';

interface ChatBubble {
  id: string; slug: string; name: string; description?: string | null; imageUrl: string; textColor?: string | null;
  isActive: boolean; sortOrder: number;
  priceCoin?: number | null; coinDays?: number | null; priceGem?: number | null; gemDays?: number | null;
}

const emptyForm = { slug: '', name: '', description: '', imageUrl: '', textColor: '', priceCoin: '', coinDays: '', priceGem: '', gemDays: '', sortOrder: '0' };
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s));
const dur = (d?: number | null) => (d == null ? 'vĩnh viễn' : `${d} ngày`);

function bubbleStyle(url?: string | null, color?: string | null) {
  if (!url) return undefined;
  return { backgroundImage: `url(${url})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', color: color || undefined } as const;
}

export default function AdminChatBubblesPage() {
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  function load() { api.get<ChatBubble[]>('/admin/chat-bubbles').then(setBubbles).catch((e) => setErr(e.message)); }
  useEffect(() => { load(); }, []);

  async function create() {
    setErr(''); setMsg('');
    if (!form.slug.trim() || !form.name.trim() || !form.imageUrl) { setErr('Nhập slug, tên và ảnh bong bóng'); return; }
    if (form.priceCoin.trim() === '' && form.priceGem.trim() === '') { setErr('Phải có ít nhất 1 giá (Xu hoặc Gem)'); return; }
    try {
      await api.post('/admin/chat-bubbles', {
        slug: form.slug.trim(), name: form.name.trim(), description: form.description, imageUrl: form.imageUrl, textColor: form.textColor || null,
        priceCoin: numOrNull(form.priceCoin), coinDays: numOrNull(form.coinDays),
        priceGem: numOrNull(form.priceGem), gemDays: numOrNull(form.gemDays),
        sortOrder: Number(form.sortOrder) || 0,
      });
      setMsg('Đã tạo bong bóng ✓'); setForm(emptyForm); load();
    } catch (e: any) { setErr(e.message); }
  }
  async function toggle(b: ChatBubble) {
    try { await api.patch(`/admin/chat-bubbles/${b.id}`, { isActive: !b.isActive }); load(); } catch (e: any) { setErr(e.message); }
  }
  async function del(b: ChatBubble) {
    if (!confirm(`Xoá bong bóng "${b.name}"?`)) return;
    try { await api.post(`/admin/chat-bubbles/${b.id}/delete`); load(); } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader icon={<MessageCircle size={20} />} title="Bong bóng chat" desc="Ảnh nền bong bóng tin nhắn (PNG co giãn theo nội dung), bán bằng Xu hoặc Gem." />
      {err && <Notice kind="error">{err}</Notice>}
      {msg && <Notice kind="success">{msg}</Notice>}

      <Card className="space-y-4">
        <SectionTitle hint="Nên dùng ảnh PNG có thể co giãn (viền/bo góc mềm). Ảnh sẽ kéo giãn 100% theo kích thước tin nhắn.">Tạo bong bóng mới</SectionTitle>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Slug (định danh)"><input className="input" placeholder="vd: bong-bong-may" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
          <Field label="Tên bong bóng"><input className="input" placeholder="vd: Bong bóng mây" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Mô tả" className="sm:col-span-2"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>

        <div className="flex items-center gap-3">
          {form.imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={form.imageUrl} alt="" className="h-16 w-28 rounded-lg border border-ink-200 object-contain dark:border-ink-700" />
            : <span className="grid h-16 w-28 place-items-center rounded-lg border border-dashed border-ink-300 text-ink-400 dark:border-ink-700"><MessageCircle /></span>}
          <ImageUpload label="Tải ảnh bong bóng" onUploaded={(url) => setForm((f) => ({ ...f, imageUrl: url }))} />
        </div>
        <Field label="Màu chữ (tuỳ chọn, mã hex hợp với ảnh)"><input className="input w-40" placeholder="#ffffff" value={form.textColor} onChange={(e) => setForm({ ...form, textColor: e.target.value })} /></Field>

        <div className="rounded-xl border border-ink-200/70 bg-ink-50 p-4 dark:border-ink-700 dark:bg-ink-800/50">
          <p className="mb-2 text-xs text-ink-400">Xem trước</p>
          <div className="flex justify-end">
            {form.imageUrl
              ? <span className="inline-block max-w-[78%] rounded-2xl px-3 py-2 text-sm" style={bubbleStyle(form.imageUrl, form.textColor)}>Tin nhắn ví dụ trong chat 👋</span>
              : <span className="inline-block max-w-[78%] rounded-2xl bg-brand-600 px-3 py-2 text-sm text-white">Tin nhắn ví dụ trong chat 👋</span>}
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
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink-400">Các bong bóng hiện có ({bubbles.length})</h2>
        {bubbles.length === 0 && <Card><Empty icon={<MessageCircle size={28} />} title="Chưa có bong bóng nào" /></Card>}
        {bubbles.map((b) => (
          <Card key={b.id} className={!b.isActive ? 'opacity-60' : ''}>
            <div className="flex items-center gap-3">
              <span className="shrink-0 rounded-2xl px-3 py-1.5 text-sm" style={bubbleStyle(b.imageUrl, b.textColor)}>{b.name}</span>
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
