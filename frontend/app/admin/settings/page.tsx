'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Setting { id: string; key: string; label: string; type: string; value: any; options?: any; validation?: any; isSecret?: boolean; }
interface Group { id: string; key: string; name: string; icon?: string; settings: Setting[]; }

export default function AdminSettings() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [msg, setMsg] = useState('');
  const [dirty, setDirty] = useState<Record<string, any>>({});

  function load() { api.get<Group[]>('/admin/config').then(setGroups).catch((e) => setMsg(e.message)); }
  useEffect(() => { load(); }, []);

  async function seed() { try { await api.post('/admin/config/seed'); setMsg('Đã khởi tạo cấu hình'); } catch (e: any) { setMsg(e.message); } load(); }

  async function saveOne(key: string) {
    try { await api.patch(`/admin/config/setting/${key}`, { value: dirty[key] }); setMsg('Đã lưu ' + key);
      setDirty((d) => { const n = { ...d }; delete n[key]; return n; });
    } catch (e: any) { setMsg(e.message); }
  }

  const setVal = (key: string, v: any) => setDirty((d) => ({ ...d, [key]: v }));
  const cur = (s: Setting) => (s.key in dirty ? dirty[s.key] : s.value);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Cấu hình hệ thống</h1>
        <button onClick={seed} className="btn-outline text-xs">Khởi tạo cấu hình mặc định</button>
      </div>
      {msg && <p className="text-sm text-brand-600">{msg}</p>}
      {groups.length === 0 && <div className="card p-6 text-center text-ink-500">Chưa có cấu hình. Bấm "Khởi tạo cấu hình mặc định".</div>}

      {groups.map((g) => (
        <section key={g.id} className="card p-4">
          <h2 className="mb-3 font-semibold">{g.name}</h2>
          <div className="space-y-3">
            {g.settings.map((s) => (
              <div key={s.key} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[240px_1fr_auto]">
                <label className="text-sm">{s.label}<div className="text-[11px] text-ink-400">{s.key}</div></label>
                <Field s={s} value={cur(s)} onChange={(v) => setVal(s.key, v)} />
                <button onClick={() => saveOne(s.key)} disabled={!(s.key in dirty)} className="btn-primary !py-1 text-xs disabled:opacity-40">Lưu</button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Field({ s, value, onChange }: { s: Setting; value: any; onChange: (v: any) => void }) {
  const opts = s.options?.options || s.validation?.options;
  switch (s.type) {
    case 'boolean':
      return <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
    case 'number':
      return <input type="number" className="input" value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} />;
    case 'textarea':
      return <textarea className="input resize-y" rows={2} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'color':
      return <input type="color" className="h-9 w-16" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />;
    case 'select':
      return (
        <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {(opts || []).map((o: any) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o.value ?? o}</option>)}
        </select>
      );
    default:
      return <input className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}
