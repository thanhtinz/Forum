'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function StoreInfo({ store, onSaved }: { store: any; onSaved: (s: any) => void }) {
  const [form, setForm] = useState<any>({ name: store?.name || '', tagline: store?.tagline || '', description: store?.description || '', logoUrl: store?.logoUrl || '', bannerUrl: store?.bannerUrl || '', policyRefund: store?.policyRefund || '' });
  const [msg, setMsg] = useState('');
  const upd = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  async function save() {
    setMsg('');
    try { const s = store ? await api.patch('/marketplace/storefront', form) : await api.post('/marketplace/storefront', form); onSaved(s); setMsg('Đã lưu ✓'); }
    catch (e: any) { setMsg(e.message); }
  }
  return (
    <div className="card space-y-3 p-5">
      {!store && <p className="text-sm text-ink-500">Bạn chưa có gian hàng — tạo ngay:</p>}
      <Field label="Tên gian hàng" v={form.name} on={upd('name')} />
      <Field label="Slogan" v={form.tagline} on={upd('tagline')} />
      <div className="grid grid-cols-2 gap-2"><Field label="Logo URL" v={form.logoUrl} on={upd('logoUrl')} /><Field label="Banner URL" v={form.bannerUrl} on={upd('bannerUrl')} /></div>
      <label className="block text-sm">Giới thiệu<textarea className="input mt-1" rows={3} value={form.description} onChange={upd('description')} /></label>
      <label className="block text-sm">Chính sách<textarea className="input mt-1" rows={2} value={form.policyRefund} onChange={upd('policyRefund')} /></label>
      <button onClick={save} className="btn-primary">{store ? 'Lưu' : 'Tạo gian hàng'}</button>
      {msg && <span className="ml-2 text-sm text-brand-600">{msg}</span>}
    </div>
  );
}

export function Products() {
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ title: '', gemPrice: 0, categoryId: '', description: '', thumbnailUrl: '' });
  const [msg, setMsg] = useState('');
  function load() { api.get<any[]>('/marketplace/me/products').then(setItems).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); api.get<any[]>('/marketplace/categories').then(setCats).catch(() => {}); }, []);
  async function add() {
    try { await api.post('/marketplace/products', { ...form, gemPrice: Number(form.gemPrice), categoryId: form.categoryId || undefined }); setForm({ title: '', gemPrice: 0, categoryId: '', description: '', thumbnailUrl: '' }); setMsg('Đã thêm'); }
    catch (e: any) { setMsg(e.message); } load();
  }
  async function del(id: string) { if (!confirm('Xóa?')) return; await api.del(`/marketplace/products/${id}`).catch(() => {}); load(); }
  return (
    <div className="space-y-4">
      <div className="card space-y-2 p-4">
        <h2 className="font-semibold">Thêm sản phẩm</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input className="input" placeholder="Tên sản phẩm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className="input" type="number" placeholder="Giá gem" value={form.gemPrice} onChange={(e) => setForm({ ...form, gemPrice: e.target.value })} />
          <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">— Danh mục —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input" placeholder="Ảnh thumbnail URL" value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} />
        </div>
        <textarea className="input" rows={2} placeholder="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button onClick={add} className="btn-primary">Thêm</button>
        {msg && <span className="ml-2 text-sm text-brand-600">{msg}</span>}
      </div>
      <div className="space-y-2">
        {items.map((p) => <ProductRow key={p.id} p={p} onDel={() => del(p.id)} />)}
        {items.length === 0 && <div className="card p-6 text-center text-ink-500">Chưa có sản phẩm.</div>}
      </div>
    </div>
  );
}

function ProductRow({ p, onDel }: { p: any; onDel: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0"><b className="truncate">{p.title}</b> <span className="text-ink-400">· {p.gemPrice} gem · {p.salesCount} bán · {p.status}</span></div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => setOpen((o) => !o)} className="btn-outline !py-1 text-xs">Gói bán</button>
          <button onClick={onDel} className="btn-outline !py-1 text-xs text-red-600">Xóa</button>
        </div>
      </div>
      {open && <PackageManager productId={p.id} />}
    </div>
  );
}

// Quản lý gói bán của 1 sản phẩm (giá theo gói + trường tuỳ chỉnh khách điền)
function PackageManager({ productId }: { productId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [desc, setDesc] = useState('');
  const [fields, setFields] = useState<{ label: string; required: boolean }[]>([]);
  const [msg, setMsg] = useState('');
  function load() { api.get<any[]>(`/marketplace/me/products/${productId}/packages`).then(setList).catch(() => {}); }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [productId]);
  async function add() {
    if (!name.trim()) { setMsg('Nhập tên gói'); return; }
    try {
      await api.post(`/marketplace/me/products/${productId}/packages`, { name: name.trim(), gemPrice: Number(price), description: desc.trim() || undefined, fields: fields.filter((f) => f.label.trim()) });
      setName(''); setPrice(0); setDesc(''); setFields([]); setMsg('');
      load();
    } catch (e: any) { setMsg(e.message); }
  }
  return (
    <div className="mt-3 space-y-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
      <p className="text-xs text-ink-500">Sản phẩm có gói thì <b>giá tính theo gói</b>; khách phải chọn gói khi mua. Thêm trường tuỳ chỉnh để khách điền thông tin (vd: tên nhân vật, email…).</p>
      {list.map((pk) => (
        <div key={pk.id} className="flex items-start justify-between gap-2 rounded-lg border border-ink-200 bg-white p-2 dark:border-ink-700 dark:bg-ink-900">
          <div className="min-w-0">
            <b>{pk.name}</b> · <span className="text-brand-600">{pk.gemPrice} gem</span>
            {pk.description && <p className="text-xs text-ink-500">{pk.description}</p>}
            {pk.fields?.length > 0 && <p className="text-[11px] text-ink-400">Trường: {pk.fields.map((f: any) => f.label + (f.required ? '*' : '')).join(', ')}</p>}
          </div>
          <button onClick={() => api.del(`/marketplace/me/packages/${pk.id}`).then(load)} className="btn-outline !py-0.5 text-xs text-red-600">Xóa</button>
        </div>
      ))}
      <div className="space-y-2 rounded-lg border border-dashed border-ink-300 p-2 dark:border-ink-700">
        <div className="grid grid-cols-2 gap-2">
          <input className="input" placeholder="Tên gói (VD: Gói cơ bản)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" type="number" placeholder="Giá gem" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <input className="input" placeholder="Mô tả gói (tuỳ chọn)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <div className="space-y-1">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className="input flex-1" placeholder="Tên trường khách điền (vd: Email)" value={f.label} onChange={(e) => setFields(fields.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.required} onChange={(e) => setFields(fields.map((x, idx) => idx === i ? { ...x, required: e.target.checked } : x))} /> Bắt buộc</label>
              <button onClick={() => setFields(fields.filter((_, idx) => idx !== i))} className="text-rose-500">✕</button>
            </div>
          ))}
          <button onClick={() => setFields([...fields, { label: '', required: false }])} className="text-xs text-brand-600">+ Thêm trường tuỳ chỉnh</button>
        </div>
        <button onClick={add} className="btn-primary !py-1 text-sm">Thêm gói</button>
        {msg && <span className="ml-2 text-sm text-rose-500">{msg}</span>}
      </div>
    </div>
  );
}

export function Coupons() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', discountPercent: 10, maxUses: 0, expiresAt: '' });
  const [msg, setMsg] = useState('');
  function load() { api.get<any[]>('/marketplace/me/coupons').then(setList).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);
  async function add() {
    if (!form.code.trim()) { setMsg('Nhập mã giảm giá'); return; }
    try { await api.post('/marketplace/coupons', { ...form, code: form.code.trim().toUpperCase(), discountPercent: Number(form.discountPercent), maxUses: Number(form.maxUses), expiresAt: form.expiresAt || undefined }); setForm({ code: '', discountPercent: 10, maxUses: 0, expiresAt: '' }); setMsg('Đã tạo mã ✓'); }
    catch (e: any) { setMsg(e.message); } load();
  }
  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-4">
        <div>
          <h2 className="font-semibold">Tạo mã giảm giá</h2>
          <p className="text-xs text-ink-500">Khách nhập mã khi mua để được giảm % trên giá sản phẩm của shop.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Mã giảm giá
            <input className="input mt-1 uppercase" placeholder="VD: SALE10" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <span className="text-[11px] text-ink-400">Khách gõ đúng mã này khi thanh toán.</span>
          </label>
          <label className="block text-sm">Phần trăm giảm (%)
            <input className="input mt-1" type="number" min={1} max={100} value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} />
            <span className="text-[11px] text-ink-400">Giảm {form.discountPercent || 0}% trên giá gốc.</span>
          </label>
          <label className="block text-sm">Giới hạn lượt dùng
            <input className="input mt-1" type="number" min={0} value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} />
            <span className="text-[11px] text-ink-400">0 = dùng không giới hạn.</span>
          </label>
          <label className="block text-sm">Ngày hết hạn
            <input className="input mt-1" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            <span className="text-[11px] text-ink-400">Để trống = không hết hạn.</span>
          </label>
        </div>
        <button onClick={add} className="btn-primary">Tạo mã</button>
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink-500">Mã đang có ({list.length})</h3>
        {list.length === 0 ? <div className="card p-6 text-center text-ink-500">Chưa có mã giảm giá.</div> : list.map((c) => (
          <div key={c.id} className="card flex flex-wrap items-center gap-3 p-3">
            <code className="rounded-lg bg-brand-100 px-2.5 py-1 text-sm font-bold tracking-wider text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">{c.code}</code>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-900/40">−{c.discountPercent}%</span>
            <span className={`text-xs ${c.isActive ? 'text-emerald-600' : 'text-ink-400'}`}>● {c.isActive ? 'Đang bật' : 'Đã tắt'}</span>
            <span className="text-xs text-ink-500">Đã dùng {c.usedCount}/{c.maxUses || '∞'}</span>
            {c.expiresAt && <span className="text-xs text-ink-400">HSD: {new Date(c.expiresAt).toLocaleDateString('vi-VN')}</span>}
            <div className="ml-auto flex gap-2">
              <button onClick={() => api.post(`/marketplace/coupons/${c.id}/toggle`).then(load)} className="btn-outline !py-1 text-xs">{c.isActive ? 'Tắt' : 'Bật'}</button>
              <button onClick={() => { if (confirm('Xóa mã này?')) api.del(`/marketplace/coupons/${c.id}`).then(load); }} className="btn-outline !py-1 text-xs text-red-600">Xóa</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Earnings() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { api.get('/marketplace/me/earnings').then(setD).catch(() => {}); }, []);
  if (!d) return <div className="p-6 text-center text-ink-500">Đang tải…</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-amber-600">{d.held}</div><div className="text-xs text-ink-500">Đang giam (3 ngày)</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold text-emerald-600">{d.released}</div><div className="text-xs text-ink-500">Đã nhận (gem)</div></div>
        <div className="card p-4 text-center"><div className="text-2xl font-bold">{d.totalOrders}</div><div className="text-xs text-ink-500">Tổng đơn</div></div>
      </div>
      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {d.orders.map((o: any) => (
          <div key={o.id} className="flex items-center justify-between p-3 text-sm">
            <div>{o.product} <span className="text-ink-400">· mua bởi {o.buyer}</span></div>
            <div className="text-right">
              <div className="font-medium text-emerald-600">+{o.sellerEarned} gem</div>
              <div className="text-xs text-ink-400">{o.escrowStatus === 'HELD' ? `Giam đến ${new Date(o.escrowReleaseAt).toLocaleDateString('vi')}` : o.escrowStatus}</div>
            </div>
          </div>
        ))}
        {d.orders.length === 0 && <div className="p-6 text-center text-ink-500">Chưa có đơn nào.</div>}
      </div>
    </div>
  );
}

export function Tickets({ ownerId }: { ownerId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const [reply, setReply] = useState('');
  function load() { api.get<any[]>('/marketplace/me/shop/tickets').then(setList).catch(() => {}); }
  useEffect(() => { load(); }, []);
  async function openTicket(id: string) { setOpen(await api.get(`/marketplace/tickets/${id}`)); }
  async function send() { if (!reply.trim()) return; await api.post(`/marketplace/tickets/${open.id}/reply`, { body: reply }).catch(() => {}); setReply(''); openTicket(open.id); load(); }
  async function close() { await api.post(`/marketplace/tickets/${open.id}/close`).catch(() => {}); setOpen(null); load(); }

  if (open) return (
    <div className="card p-4">
      <button onClick={() => setOpen(null)} className="mb-2 text-sm text-ink-500">← Danh sách</button>
      <h2 className="font-semibold">{open.subject} <span className="chip ml-2 bg-ink-200 text-ink-600">{open.status}</span></h2>
      <div className="my-3 space-y-2">
        {open.messages.map((m: any) => (
          <div key={m.id} className={`rounded-lg p-2 text-sm ${m.senderId === ownerId ? 'ml-8 bg-brand-50 dark:bg-ink-800' : 'mr-8 bg-ink-100 dark:bg-ink-900'}`}>
            <div className="text-[11px] text-ink-400">{m.senderId === ownerId ? 'Shop' : 'Khách'}</div>{m.body}
          </div>
        ))}
      </div>
      {open.status !== 'CLOSED' && (
        <div className="flex gap-2">
          <input className="input" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Trả lời…" />
          <button onClick={send} className="btn-primary">Gửi</button>
          <button onClick={close} className="btn-outline text-xs">Đóng</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="card divide-y divide-ink-100 dark:divide-ink-800">
      {list.map((t) => (
        <button key={t.id} onClick={() => openTicket(t.id)} className="flex w-full items-center justify-between p-3 text-left text-sm hover:bg-ink-50 dark:hover:bg-ink-800/50">
          <span>{t.subject}</span>
          <span className="chip bg-ink-200 text-ink-600">{t.status}</span>
        </button>
      ))}
      {list.length === 0 && <div className="p-6 text-center text-ink-500">Chưa có ticket nào.</div>}
    </div>
  );
}

export function Field({ label, v, on }: { label: string; v: string; on: (e: any) => void }) {
  return <label className="block text-sm">{label}<input className="input mt-1" value={v} onChange={on} /></label>;
}

// Header dùng chung cho các trang seller
export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-bold">{title}</h1>
      {action}
    </div>
  );
}
