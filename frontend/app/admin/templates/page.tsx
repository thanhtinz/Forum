'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

const TYPES = [
  { id: 'crop', label: 'Cây trồng' },
  { id: 'fish', label: 'Cá' },
  { id: 'fertilizer', label: 'Phân bón' },
  { id: 'animal', label: 'Vật nuôi' },
  { id: 'recipe', label: 'Công thức' },
  { id: 'avatar', label: 'Wardrobe/Pet/Mount' },
  { id: 'consumable', label: 'Đồ ăn (consumable)' },
  { id: 'gempackage', label: 'Gói nạp Gem' },
];

export default function AdminTemplates() {
  const [type, setType] = useState('crop');
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [json, setJson] = useState('');
  const [msg, setMsg] = useState('');

  function load() { api.get<any[]>(`/admin/templates/${type}`).then(setRows).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); setEditing(null); /* eslint-disable-next-line */ }, [type]);

  function openEdit(row: any) { setEditing(row); setJson(JSON.stringify(row, null, 2)); setMsg(''); }
  function openNew() { setEditing({}); setJson('{\n  "slug": "",\n  "name": ""\n}'); setMsg(''); }

  async function save() {
    let data: any;
    try { data = JSON.parse(json); } catch { setMsg('JSON không hợp lệ'); return; }
    try {
      if (editing?.id) await api.patch(`/admin/templates/${type}/${editing.id}`, data);
      else await api.post(`/admin/templates/${type}`, data);
      setMsg('Đã lưu'); setEditing(null);
    } catch (e: any) { setMsg(e.message); }
    load();
  }
  async function del(id: string) {
    if (!confirm('Xóa mục này?')) return;
    try { await api.del(`/admin/templates/${type}/${id}`); setMsg('Đã xóa'); } catch (e: any) { setMsg(e.message); }
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dữ liệu game</h1>
        <button onClick={openNew} className="btn-primary text-xs">+ Thêm mới</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => setType(t.id)} className={`rounded-lg px-3 py-1.5 text-sm ${type === t.id ? 'bg-brand-600 text-white' : 'bg-ink-100 dark:bg-ink-800'}`}>{t.label}</button>
        ))}
      </div>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}

      {editing && (
        <div className="card p-4">
          <h2 className="mb-2 font-semibold">{editing.id ? 'Sửa' : 'Thêm'} ({type})</h2>
          <textarea className="input font-mono text-xs" rows={14} value={json} onChange={(e) => setJson(e.target.value)} />
          <div className="mt-2 flex gap-2">
            <button onClick={save} className="btn-primary">Lưu</button>
            <button onClick={() => setEditing(null)} className="btn-outline">Hủy</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-ink-100 dark:divide-ink-800">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <b>{r.name || r.slug}</b> <span className="text-ink-400">/{r.slug}</span>
              <span className="ml-2 text-xs text-ink-400">
                {r.priceCoin != null && `coin ${r.priceCoin}`}{r.seedPrice != null && `hạt ${r.seedPrice}`}{r.pricePerKg != null && `${r.pricePerKg}/kg`}{r.slot && ` · ${r.slot}`}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(r)} className="btn-outline !py-1 text-xs">Sửa</button>
              <button onClick={() => del(r.id)} className="btn-outline !py-1 text-xs text-red-600">Xóa</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="p-6 text-center text-ink-500">Không có dữ liệu.</div>}
      </div>
    </div>
  );
}
