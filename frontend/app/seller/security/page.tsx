'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

export default function SellerSecurity() {
  const [f, setF] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState('');
  // 2FA
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState('');
  const [tfaMsg, setTfaMsg] = useState('');

  function loadTfa() { api.get<{ enabled: boolean }>('/auth/2fa/status').then((s) => setEnabled(s.enabled)).catch(() => {}); }
  useEffect(() => { loadTfa(); }, []);

  async function savePw() {
    setMsg('');
    if (f.newPassword !== f.confirm) { setMsg('Mật khẩu xác nhận không khớp'); return; }
    try { await api.post('/auth/change-password', { oldPassword: f.oldPassword, newPassword: f.newPassword }); setMsg('Đổi mật khẩu thành công ✓'); setF({ oldPassword: '', newPassword: '', confirm: '' }); }
    catch (e: any) { setMsg(e.message); }
  }

  async function startSetup() { try { setSetup(await api.post('/auth/2fa/setup')); setTfaMsg(''); } catch (e: any) { setTfaMsg(e.message); } }
  async function enable() { try { await api.post('/auth/2fa/enable', { code }); setSetup(null); setCode(''); setTfaMsg('Đã bật 2FA ✓'); loadTfa(); } catch (e: any) { setTfaMsg(e.message); } }
  async function disable() { try { await api.post('/auth/2fa/disable', { code }); setCode(''); setTfaMsg('Đã tắt 2FA'); loadTfa(); } catch (e: any) { setTfaMsg(e.message); } }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck /> Bảo mật</h1>

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">Đổi mật khẩu</h2>
        <input type="password" className="input" placeholder="Mật khẩu hiện tại" value={f.oldPassword} onChange={(e) => setF({ ...f, oldPassword: e.target.value })} />
        <input type="password" className="input" placeholder="Mật khẩu mới" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
        <input type="password" className="input" placeholder="Xác nhận mật khẩu mới" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
        <button onClick={savePw} className="btn-primary">Cập nhật</button>
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
      </div>

      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">Xác thực 2 lớp (2FA) {enabled && <span className="chip ml-1 bg-emerald-100 text-emerald-700">Đang bật</span>}</h2>
        {!enabled && !setup && <button onClick={startSetup} className="btn-primary">Bật 2FA</button>}
        {!enabled && setup && (
          <div className="space-y-2">
            <p className="text-sm text-ink-500">Quét QR bằng Google Authenticator / Authy:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="2FA QR" className="rounded-lg border border-ink-200/70 dark:border-ink-800" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(setup.otpauth)}`} />
            <p className="text-xs text-ink-400">Hoặc nhập khóa: <code>{setup.secret}</code></p>
            <div className="flex gap-2">
              <input className="input" placeholder="Mã 6 số" value={code} onChange={(e) => setCode(e.target.value)} />
              <button onClick={enable} className="btn-primary">Xác nhận bật</button>
            </div>
          </div>
        )}
        {enabled && (
          <div className="flex gap-2">
            <input className="input" placeholder="Mã 6 số để tắt" value={code} onChange={(e) => setCode(e.target.value)} />
            <button onClick={disable} className="btn-outline text-red-600">Tắt 2FA</button>
          </div>
        )}
        {tfaMsg && <p className="text-sm text-brand-600">{tfaMsg}</p>}
      </div>
    </div>
  );
}
