'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const PERMS = [['products', 'Sản phẩm'], ['orders', 'Đơn hàng'], ['tickets', 'Ticket'], ['coupons', 'Mã giảm giá'], ['stock', 'Kho hàng']];

export default function SellerStaff() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState<{ username: string; role: string; permissions: string[] }>({ username: '', role: 'STAFF', permissions: [] });
  const [msg, setMsg] = useState('');
  function load() { api.get<any[]>('/marketplace/seller/staff').then(setList).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);

  function togglePerm(p: string) { setForm((f) => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] })); }
  async function add() {
    try { await api.post('/marketplace/seller/staff', form); setForm({ username: '', role: 'STAFF', permissions: [] }); setMsg('Đã thêm'); } catch (e: any) { setMsg(e.message); }
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Nhân viên gian hàng</h1>
      <div className="card space-y-3 p-4">
        <h2 className="font-semibold">Thêm nhân viên</h2>
        <div className="flex flex-wrap items-end gap-2">
          <input className="input w-48" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <select className="input w-36" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="STAFF">Nhân viên</option><option value="MANAGER">Quản lý (toàn quyền)</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {PERMS.map(([p, l]) => (
            <label key={p} className="flex items-center gap-1"><input type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePerm(p)} /> {l}</label>
          ))}
        </div>
        <button onClick={add} className="btn-primary">Thêm</button>
        {msg && <span className="ml-2 text-sm text-brand-600">{msg}</span>}
      </div>
      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {list.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-3 text-sm">
            <div><b>{s.user?.username || s.userId}</b> <span className="chip ml-1 bg-ink-200 text-ink-600">{s.role}</span> <span className="text-ink-400">· {s.permissions.join(', ') || 'không quyền'}</span></div>
            <button onClick={() => api.del(`/marketplace/seller/staff/${s.id}`).then(load)} className="btn-outline !py-1 text-xs text-red-600">Xóa</button>
          </div>
        ))}
        {list.length === 0 && <div className="p-6 text-center text-ink-500">Chưa có nhân viên.</div>}
      </div>
    </div>
  );
}
