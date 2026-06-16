'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { api } from '@/lib/api';

type Tab = 'stats' | 'categories' | 'stores' | 'products' | 'orders' | 'withdrawals' | 'tickets' | 'coupons' | 'perks';
const TABS: [Tab, string][] = [['stats', 'Tổng quan'], ['categories', 'Danh mục'], ['stores', 'Cửa hàng'], ['products', 'Sản phẩm'], ['orders', 'Đơn hàng'], ['withdrawals', 'Rút tiền'], ['perks', 'Giá dịch vụ'], ['tickets', 'Ticket'], ['coupons', 'Mã giảm giá']];

export default function AdminMarketplace() {
  const [tab, setTab] = useState<Tab>('stats');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Quản lý Chợ</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map(([id, l]) => <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === id ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{l}</button>)}
      </div>
      {tab === 'stats' && <Stats />}
      {tab === 'categories' && <Categories />}
      {tab === 'stores' && <Stores />}
      {tab === 'products' && <Products />}
      {tab === 'orders' && <Orders />}
      {tab === 'withdrawals' && <Withdrawals />}
      {tab === 'perks' && <Perks />}
      {tab === 'tickets' && <Simple url="/marketplace/admin/tickets" render={(t: any) => `[${t.status}] ${t.subject} — ${t.storefront?.name}`} />}
      {tab === 'coupons' && <Simple url="/marketplace/admin/coupons" render={(c: any) => `${c.code} (-${c.discountPercent}%) — ${c.storefront?.name} · dùng ${c.usedCount}`} />}
    </div>
  );
}

function Stats() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { api.get('/marketplace/admin/stats').then(setS).catch(() => {}); }, []);
  if (!s) return <div className="p-6 text-center text-ink-500">Đang tải…</div>;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[['Cửa hàng', s.stores], ['Sản phẩm', s.products], ['Đơn hàng', s.orders], ['Gem đang giam', s.heldGem]].map(([l, v]) => (
        <div key={l as string} className="card p-4 text-center"><div className="text-2xl font-bold">{v as number}</div><div className="text-xs text-ink-500">{l}</div></div>
      ))}
    </div>
  );
}

function Categories() {
  const [cats, setCats] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', icon: '', sortOrder: 0 });
  function load() { api.get<any[]>('/marketplace/categories').then(setCats).catch(() => {}); }
  useEffect(() => { load(); }, []);
  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-end gap-2 p-4">
        <input className="input w-48" placeholder="Tên danh mục" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input w-24" placeholder="Icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        <button onClick={async () => { await api.post('/marketplace/admin/categories', { ...form, sortOrder: Number(form.sortOrder) }).catch(() => {}); setForm({ name: '', icon: '', sortOrder: 0 }); load(); }} className="btn-primary">Thêm</button>
      </div>
      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {cats.map((c) => <div key={c.id} className="flex justify-between p-3 text-sm"><span><b>{c.name}</b> /{c.slug}</span><button onClick={async () => { if (confirm('Xóa?')) { await api.del(`/marketplace/admin/categories/${c.id}`).catch(() => {}); load(); } }} className="btn-outline !py-1 text-xs text-red-600">Xóa</button></div>)}
      </div>
    </div>
  );
}

function Stores() {
  const [list, setList] = useState<any[]>([]);
  function load() { api.get<any[]>('/marketplace/admin/storefronts').then(setList).catch(() => {}); }
  useEffect(() => { load(); }, []);
  const toggle = async (id: string, field: string) => { await api.post(`/marketplace/admin/storefronts/${id}/toggle`, { field }).catch(() => {}); load(); };
  return (
    <div className="card divide-y divide-ink-100 dark:divide-ink-800">
      {list.map((s) => (
        <div key={s.id} className="flex items-center justify-between p-3 text-sm">
          <span className="inline-flex items-center gap-1"><b>{s.name}</b> {s.isVerified && <BadgeCheck size={16} className="text-brand-600" />} {!s.isActive && '· (ẩn)'} <span className="text-ink-400">· {s.totalSales} bán</span></span>
          <div className="flex gap-2">
            <button onClick={() => toggle(s.id, 'isVerified')} className="btn-outline !py-1 text-xs">{s.isVerified ? 'Bỏ verify' : 'Verify'}</button>
            <button onClick={() => toggle(s.id, 'isActive')} className="btn-outline !py-1 text-xs">{s.isActive ? 'Ẩn' : 'Hiện'}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function Products() {
  const [list, setList] = useState<any[]>([]);
  function load() { api.get<any[]>('/marketplace/admin/products').then(setList).catch(() => {}); }
  useEffect(() => { load(); }, []);
  return (
    <div className="card divide-y divide-ink-100 dark:divide-ink-800">
      {list.map((p) => (
        <div key={p.id} className="flex items-center justify-between p-3 text-sm">
          <span><b>{p.title}</b> <span className="text-ink-400">· {p.seller?.username} · {p.status}</span></span>
          <button onClick={async () => { await api.post(`/marketplace/admin/products/${p.id}/status`, { status: p.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED' }).catch(() => {}); load(); }} className="btn-outline !py-1 text-xs">{p.status === 'SUSPENDED' ? 'Mở' : 'Khóa'}</button>
        </div>
      ))}
    </div>
  );
}

function Orders() {
  const [list, setList] = useState<any[]>([]);
  function load() { api.get<any[]>('/marketplace/admin/orders').then(setList).catch(() => {}); }
  useEffect(() => { load(); }, []);
  return (
    <div className="card divide-y divide-ink-100 dark:divide-ink-800">
      {list.map((o) => (
        <div key={o.id} className="flex items-center justify-between p-3 text-sm">
          <span>{o.product?.title} <span className="text-ink-400">· {o.buyer?.username} · {o.gemSpent} gem · {o.escrowStatus}</span></span>
          {o.escrowStatus === 'HELD' && (
            <div className="flex gap-2">
              <button onClick={async () => { await api.post(`/marketplace/admin/orders/${o.id}/release`).catch(() => {}); load(); }} className="btn-outline !py-1 text-xs text-emerald-600">Giải ngân</button>
              <button onClick={async () => { await api.post(`/marketplace/admin/orders/${o.id}/refund`, { reason: 'Admin hoàn' }).catch(() => {}); load(); }} className="btn-outline !py-1 text-xs text-red-600">Hoàn tiền</button>
            </div>
          )}
        </div>
      ))}
      {list.length === 0 && <div className="p-6 text-center text-ink-500">Chưa có đơn.</div>}
    </div>
  );
}

function Withdrawals() {
  const [list, setList] = useState<any[]>([]);
  function load() { api.get<any[]>('/marketplace/admin/withdrawals').then(setList).catch(() => {}); }
  useEffect(() => { load(); }, []);
  const act = async (id: string, action: string) => { await api.post(`/marketplace/admin/withdrawals/${id}/${action}`).catch(() => {}); load(); };
  return (
    <div className="card divide-y divide-ink-100 dark:divide-ink-800">
      {list.map((w) => (
        <div key={w.id} className="flex items-center justify-between p-3 text-sm">
          <span><b>{w.amount} gem</b> · {w.methodLabel} <span className="chip ml-2 bg-ink-200 text-ink-600">{w.status}</span></span>
          {(w.status === 'PENDING' || w.status === 'APPROVED') && (
            <div className="flex gap-2">
              <button onClick={() => act(w.id, 'paid')} className="btn-outline !py-1 text-xs text-emerald-600">Đã chi</button>
              <button onClick={() => act(w.id, 'reject')} className="btn-outline !py-1 text-xs text-red-600">Từ chối</button>
            </div>
          )}
        </div>
      ))}
      {list.length === 0 && <div className="p-6 text-center text-ink-500">Không có yêu cầu rút.</div>}
    </div>
  );
}

function Perks() {
  const [c, setC] = useState<any>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { api.get('/marketplace/admin/perk-config').then(setC).catch((e) => setMsg(e.message)); }, []);
  if (!c) return <div className="p-6 text-center text-ink-500">{msg || 'Đang tải…'}</div>;
  const groups: [string, string, string[]][] = [
    ['pinProduct', 'Ghim sản phẩm', ['d1', 'd7', 'd30']],
    ['featureProduct', 'Đề xuất sản phẩm', ['d1', 'd7', 'd30']],
    ['featureStore', 'Đề xuất gian hàng', ['d1', 'd7', 'd30']],
    ['aiShop', 'Gói AI shop', ['month', 'forever']],
  ];
  const lbl: Record<string, string> = { d1: '1 ngày', d7: '7 ngày', d30: '1 tháng', month: 'Tháng', forever: 'Vĩnh viễn' };
  return (
    <div className="space-y-4">
      {groups.map(([g, title, keys]) => (
        <div key={g} className="card p-4">
          <h3 className="mb-2 font-semibold">{title} (gem)</h3>
          <div className="flex flex-wrap gap-3">
            {keys.map((k) => (
              <label key={k} className="text-sm">{lbl[k]}
                <input type="number" className="input mt-1 w-28" value={c[g][k]} onChange={(e) => setC({ ...c, [g]: { ...c[g], [k]: Number(e.target.value) } })} />
              </label>
            ))}
          </div>
        </div>
      ))}
      <button onClick={async () => { try { await api.put('/marketplace/admin/perk-config', c); setMsg('Đã lưu ✓'); } catch (e: any) { setMsg(e.message); } }} className="btn-primary">Lưu giá</button>
      {msg && <span className="ml-2 text-sm text-brand-600">{msg}</span>}
    </div>
  );
}

function Simple({ url, render }: { url: string; render: (x: any) => string }) {
  const [list, setList] = useState<any[]>([]);
  useEffect(() => { api.get<any[]>(url).then(setList).catch(() => {}); }, [url]);
  return <div className="card divide-y divide-ink-100 dark:divide-ink-800">{list.map((x) => <div key={x.id} className="p-3 text-sm">{render(x)}</div>)}{list.length === 0 && <div className="p-6 text-center text-ink-500">Trống.</div>}</div>;
}
