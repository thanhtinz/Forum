'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Cat { id: string; slug: string; name: string; icon?: string; sortOrder: number; isActive: boolean; }

export default function AdminMarketplace() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [form, setForm] = useState({ name: '', icon: '', sortOrder: 0 });
  const [msg, setMsg] = useState('');

  function load() { api.get<Cat[]>('/marketplace/categories').then(setCats).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);

  async function add() {
    try { await api.post('/marketplace/admin/categories', { ...form, sortOrder: Number(form.sortOrder) }); setForm({ name: '', icon: '', sortOrder: 0 }); setMsg('Đã thêm'); }
    catch (e: any) { setMsg(e.message); } load();
  }
  async function del(id: string) { if (!confirm('Xóa danh mục?')) return; await api.del(`/marketplace/admin/categories/${id}`).catch(() => {}); load(); }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Danh mục chợ (chỉ admin tạo)</h1>
      <div className="card flex flex-wrap items-end gap-2 p-4">
        <label className="text-sm">Tên<input className="input mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-sm">Icon<input className="input mt-1 w-24" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></label>
        <label className="text-sm">Thứ tự<input className="input mt-1 w-20" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></label>
        <button onClick={add} className="btn-primary">Thêm</button>
        {msg && <span className="text-sm text-brand-600">{msg}</span>}
      </div>
      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {cats.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3 text-sm">
            <span><b>{c.name}</b> <span className="text-ink-400">/{c.slug}</span></span>
            <button onClick={() => del(c.id)} className="btn-outline !py-1 text-xs text-red-600">Xóa</button>
          </div>
        ))}
        {cats.length === 0 && <div className="p-6 text-center text-ink-500">Chưa có danh mục.</div>}
      </div>
    </div>
  );
}
