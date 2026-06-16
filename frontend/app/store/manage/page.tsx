'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Store, Package, Ticket, BadgePercent, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

type Tab = 'info' | 'products' | 'coupons' | 'tickets';

export default function ManageStore() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('info');
  const [store, setStore] = useState<any>(null);
  const [hasStore, setHasStore] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    api.get<any>('/marketplace/me/storefront').then((s) => { setStore(s); setHasStore(!!s); }).catch(() => setHasStore(false));
  }, [user, loading]);

  if (!loading && !user) return <div className="card p-8 text-center text-ink-500">Đăng nhập để quản lý gian hàng.</div>;
  if (hasStore === null) return <div className="p-10 text-center text-ink-500">Đang tải…</div>;

  const TABS: [Tab, string, any][] = [['info', 'Thông tin', Info], ['products', 'Sản phẩm', Package], ['coupons', 'Mã giảm giá', BadgePercent], ['tickets', 'Hỗ trợ', Ticket]];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold"><Store /> Quản lý gian hàng</h1>
        {store && <Link href={`/store?slug=${store.slug}`} className="btn-outline text-xs">Xem gian hàng →</Link>}
      </div>

      {!hasStore ? (
        <StoreInfo onSaved={(s) => { setStore(s); setHasStore(true); }} store={null} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {TABS.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${tab === id ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
          {tab === 'info' && <StoreInfo store={store} onSaved={setStore} />}
          {tab === 'products' && <Products />}
          {tab === 'coupons' && <Coupons />}
          {tab === 'tickets' && <Tickets ownerId={user!.id} />}
        </>
      )}
    </div>
  );
}

function StoreInfo({ store, onSaved }: { store: any; onSaved: (s: any) => void }) {
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

function Products() {
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
      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {items.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-3 text-sm">
            <div><b>{p.title}</b> <span className="text-ink-400">· {p.gemPrice} gem · {p.salesCount} bán · {p.status}</span></div>
            <button onClick={() => del(p.id)} className="btn-outline !py-1 text-xs text-red-600">Xóa</button>
          </div>
        ))}
        {items.length === 0 && <div className="p-6 text-center text-ink-500">Chưa có sản phẩm.</div>}
      </div>
    </div>
  );
}

function Coupons() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ code: '', discountPercent: 10, maxUses: 0, expiresAt: '' });
  const [msg, setMsg] = useState('');
  function load() { api.get<any[]>('/marketplace/me/coupons').then(setList).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);
  async function add() {
    try { await api.post('/marketplace/coupons', { ...form, discountPercent: Number(form.discountPercent), maxUses: Number(form.maxUses), expiresAt: form.expiresAt || undefined }); setForm({ code: '', discountPercent: 10, maxUses: 0, expiresAt: '' }); setMsg('Đã tạo'); }
    catch (e: any) { setMsg(e.message); } load();
  }
  return (
    <div className="space-y-4">
      <div className="card space-y-2 p-4">
        <h2 className="font-semibold">Tạo mã giảm giá</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input className="input" placeholder="Mã (VD: SALE10)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <input className="input" type="number" placeholder="% giảm" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Số lượt (0=∞)" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: Number(e.target.value) })} />
          <input className="input" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
        </div>
        <button onClick={add} className="btn-primary">Tạo mã</button>
        {msg && <span className="ml-2 text-sm text-brand-600">{msg}</span>}
      </div>
      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {list.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 text-sm">
            <div><code className="font-bold">{c.code}</code> · -{c.discountPercent}% · dùng {c.usedCount}/{c.maxUses || '∞'} {c.isActive ? '' : '· (tắt)'}</div>
            <div className="flex gap-2">
              <button onClick={() => api.post(`/marketplace/coupons/${c.id}/toggle`).then(load)} className="btn-outline !py-1 text-xs">{c.isActive ? 'Tắt' : 'Bật'}</button>
              <button onClick={() => api.del(`/marketplace/coupons/${c.id}`).then(load)} className="btn-outline !py-1 text-xs text-red-600">Xóa</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="p-6 text-center text-ink-500">Chưa có mã giảm giá.</div>}
      </div>
    </div>
  );
}

function Tickets({ ownerId }: { ownerId: string }) {
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

function Field({ label, v, on }: { label: string; v: string; on: (e: any) => void }) {
  return <label className="block text-sm">{label}<input className="input mt-1" value={v} onChange={on} /></label>;
}
