'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ShieldCheck } from 'lucide-react';

interface Cfg { enabled: boolean; provider: 'turnstile' | 'hcaptcha' | 'recaptcha'; siteKey: string; secretKey: string }

export default function AdminSecurity() {
  const [cfg, setCfg] = useState<Cfg>({ enabled: false, provider: 'turnstile', siteKey: '', secretKey: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => { api.get<Cfg>('/security/admin/captcha').then(setCfg).catch(() => {}); }, []);
  const upd = (k: keyof Cfg) => (e: any) => setCfg({ ...cfg, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function save() {
    setMsg('');
    try { const r = await api.post<Cfg>('/security/admin/captcha', cfg); setCfg(r); setMsg('Đã lưu ✓'); setTimeout(() => setMsg(''), 2500); }
    catch (e: any) { setMsg(e.message); }
  }

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck size={20} /> Chống spam — CAPTCHA</h1>
      <p className="text-sm text-ink-500">
        Bật CAPTCHA khi đăng ký để chặn bot. Hỗ trợ Cloudflare Turnstile (miễn phí), hCaptcha, reCAPTCHA v2. Lấy Site Key & Secret Key tại trang quản lý của nhà cung cấp.
        Ngoài ra hệ thống đã bật <b>giới hạn tần suất request</b> (120 req/phút/IP) sẵn.
      </p>
      <div className="card space-y-3 p-4">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={cfg.enabled} onChange={upd('enabled')} /> Bật CAPTCHA khi đăng ký</label>
        <div>
          <label className="mb-1 block text-sm text-ink-500">Nhà cung cấp</label>
          <select className="input" value={cfg.provider} onChange={upd('provider')}>
            <option value="turnstile">Cloudflare Turnstile</option>
            <option value="hcaptcha">hCaptcha</option>
            <option value="recaptcha">Google reCAPTCHA v2</option>
          </select>
        </div>
        <div><label className="mb-1 block text-sm text-ink-500">Site Key</label><input className="input" value={cfg.siteKey} onChange={upd('siteKey')} /></div>
        <div><label className="mb-1 block text-sm text-ink-500">Secret Key</label><input className="input" type="password" value={cfg.secretKey} onChange={upd('secretKey')} /></div>
        <div className="flex items-center gap-3"><button onClick={save} className="btn-primary">Lưu</button>{msg && <span className="text-sm text-emerald-600">{msg}</span>}</div>
      </div>
    </div>
  );
}
