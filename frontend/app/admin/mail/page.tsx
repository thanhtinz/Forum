'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Mail } from 'lucide-react';

interface Cfg {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export default function AdminMail() {
  const [cfg, setCfg] = useState<Cfg>({ enabled: false, host: '', port: 587, secure: false, user: '', pass: '', fromName: 'Forum', fromEmail: '' });
  const [msg, setMsg] = useState('');
  const [testTo, setTestTo] = useState('');

  useEffect(() => { api.get<Cfg>('/mail/admin/config').then(setCfg).catch(() => {}); }, []);

  const upd = (k: keyof Cfg) => (e: any) => setCfg({ ...cfg, [k]: e.target.type === 'checkbox' ? e.target.checked : (k === 'port' ? Number(e.target.value) : e.target.value) });

  async function save() {
    setMsg('');
    try { const r = await api.post<Cfg>('/mail/admin/config', cfg); setCfg(r); setMsg('Đã lưu ✓'); setTimeout(() => setMsg(''), 2500); }
    catch (e: any) { setMsg(e.message); }
  }
  async function sendTest() {
    setMsg('');
    try { const r = await api.post<{ to: string }>('/mail/admin/test', { to: testTo || undefined }); setMsg('Đã gửi email thử tới ' + r.to); }
    catch (e: any) { setMsg('Lỗi: ' + e.message); }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><Mail size={20} /> Email / SMTP</h1>
      <p className="text-sm text-ink-500">Cấu hình SMTP để gửi email xác thực tài khoản, đặt lại mật khẩu và thông báo. Khi tắt, các email này sẽ bị bỏ qua (hệ thống vẫn chạy bình thường).</p>

      <div className="card space-y-3 p-4">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={cfg.enabled} onChange={upd('enabled')} /> Bật gửi email</label>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="mb-1 block text-sm text-ink-500">SMTP Host</label><input className="input" placeholder="smtp.gmail.com" value={cfg.host} onChange={upd('host')} /></div>
          <div><label className="mb-1 block text-sm text-ink-500">Port</label><input className="input" type="number" value={cfg.port} onChange={upd('port')} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.secure} onChange={upd('secure')} /> SSL/TLS (secure — bật nếu port 465)</label>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="mb-1 block text-sm text-ink-500">SMTP User</label><input className="input" value={cfg.user} onChange={upd('user')} /></div>
          <div><label className="mb-1 block text-sm text-ink-500">SMTP Password</label><input className="input" type="password" value={cfg.pass} onChange={upd('pass')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className="mb-1 block text-sm text-ink-500">Tên người gửi</label><input className="input" value={cfg.fromName} onChange={upd('fromName')} /></div>
          <div><label className="mb-1 block text-sm text-ink-500">Email người gửi</label><input className="input" placeholder="no-reply@domain.com" value={cfg.fromEmail} onChange={upd('fromEmail')} /></div>
        </div>
        <div className="flex items-center gap-3"><button onClick={save} className="btn-primary">Lưu</button>{msg && <span className="text-sm text-emerald-600">{msg}</span>}</div>
      </div>

      <div className="card space-y-2 p-4">
        <h2 className="font-semibold">Gửi email thử</h2>
        <div className="flex gap-2">
          <input className="input flex-1" placeholder="Email nhận (mặc định: email của bạn)" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <button onClick={sendTest} className="btn-outline">Gửi thử</button>
        </div>
      </div>
    </div>
  );
}
