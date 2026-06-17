'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { BellRing } from 'lucide-react';

interface Cfg { enabled: boolean; publicKey: string; privateKey: string; subject: string }

export default function AdminPush() {
  const [cfg, setCfg] = useState<Cfg>({ enabled: false, publicKey: '', privateKey: '', subject: 'mailto:admin@example.com' });
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get<Cfg>('/notifications/admin/push').then(setCfg).catch(() => {}); }, []);
  const upd = (k: keyof Cfg) => (e: any) => setCfg({ ...cfg, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function gen() {
    try { const r = await api.post<{ publicKey: string; privateKey: string }>('/notifications/admin/push/generate', {}); setCfg({ ...cfg, publicKey: r.publicKey, privateKey: r.privateKey }); setMsg('Đã tạo cặp khoá VAPID — nhớ Lưu.'); }
    catch (e: any) { setMsg(e.message); }
  }
  async function save() {
    setMsg('');
    try { const r = await api.post<Cfg>('/notifications/admin/push', cfg); setCfg(r); setMsg('Đã lưu ✓'); setTimeout(() => setMsg(''), 2500); }
    catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><BellRing size={20} /> Web Push (thông báo trình duyệt)</h1>
      <p className="text-sm text-ink-500">Bật để đẩy thông báo tới trình duyệt người dùng (kể cả khi không mở tab). Cần cặp khoá VAPID — bấm "Tạo khoá" rồi Lưu. `Subject` là email/URL liên hệ (định dạng <code>mailto:...</code>).</p>
      <div className="card space-y-3 p-4">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={cfg.enabled} onChange={upd('enabled')} /> Bật Web Push</label>
        <div><label className="mb-1 block text-sm text-ink-500">Subject</label><input className="input" value={cfg.subject} onChange={upd('subject')} /></div>
        <div><label className="mb-1 block text-sm text-ink-500">VAPID Public Key</label><input className="input font-mono text-xs" value={cfg.publicKey} onChange={upd('publicKey')} /></div>
        <div><label className="mb-1 block text-sm text-ink-500">VAPID Private Key</label><input className="input font-mono text-xs" type="password" value={cfg.privateKey} onChange={upd('privateKey')} /></div>
        <div className="flex items-center gap-2">
          <button onClick={gen} className="btn-outline">Tạo khoá VAPID</button>
          <button onClick={save} className="btn-primary">Lưu</button>
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
        </div>
      </div>
    </div>
  );
}
