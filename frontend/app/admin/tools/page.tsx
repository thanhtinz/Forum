'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Tool { id: string; slug: string; name: string; description: string; component: string; isPro: boolean; isActive: boolean; usageCount: number; }
interface Cat { id: string; slug: string; name: string; tools: Tool[]; }

export default function AdminTools() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ categoryId: '', slug: '', name: '', description: '', component: '', isPro: false });

  function load() { api.get<Cat[]>('/tools/admin/all').then(setCats).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);

  const act = async (fn: () => Promise<any>) => { try { await fn(); setMsg('OK'); } catch (e: any) { setMsg(e.message); } load(); };

  async function create() {
    if (!form.categoryId || !form.slug || !form.name || !form.component) { setMsg('Điền đủ nhóm/slug/tên/component'); return; }
    await act(() => api.post('/tools/admin/tool', form));
    setForm({ ...form, slug: '', name: '', description: '', component: '' });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Quản lý Công cụ</h1>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      <section className="card p-4">
        <h2 className="mb-3 font-semibold">Thêm công cụ</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
            <option value="">— Nhóm —</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input" placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          <input className="input" placeholder="Tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <input className="input" placeholder="Component (React)" value={form.component} onChange={(e) => setForm({ ...form, component: e.target.value })} />
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPro} onChange={(e) => setForm({ ...form, isPro: e.target.checked })} /> PRO</label>
        <button onClick={create} className="btn-primary mt-2">Thêm</button>
      </section>

      {cats.map((c) => (
        <section key={c.id} className="card p-4">
          <h2 className="mb-2 font-semibold">{c.name} <span className="text-xs text-ink-400">({c.tools.length})</span></h2>
          <div className="space-y-1">
            {c.tools.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-ink-100 py-2 text-sm dark:border-ink-800">
                <div>
                  <b>{t.name}</b> <span className="text-ink-400">/{t.slug}</span>
                  {t.isPro && <span className="chip ml-1 bg-amber-100 text-amber-700">PRO</span>}
                  {!t.isActive && <span className="chip ml-1 bg-ink-200 text-ink-600">Ẩn</span>}
                  <span className="ml-2 text-xs text-ink-400">{t.usageCount} lượt</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(() => api.patch(`/tools/admin/tool/${t.id}`, { isActive: !t.isActive }))} className="btn-outline !py-1 text-xs">{t.isActive ? 'Ẩn' : 'Hiện'}</button>
                  <button onClick={() => act(() => api.del(`/tools/admin/tool/${t.id}`))} className="btn-outline !py-1 text-xs text-red-600">Xóa</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
