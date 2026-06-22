'use client';

import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';

export default function AccountSettings() {
  const { user, loading: authLoading } = useAuth();

  // Đổi mật khẩu
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 2FA
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string } | null>(null);
  const [code, setCode] = useState('');
  const [faBusy, setFaBusy] = useState(false);
  const [faMsg, setFaMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function loadStatus() {
    api.get<{ enabled: boolean }>('/auth/2fa/status').then((r) => setEnabled(r.enabled)).catch(() => {});
  }
  useEffect(() => { loadStatus(); }, []);

  async function changePassword() {
    setPwMsg(null);
    if (newPw.length < 6) { setPwMsg({ ok: false, text: 'Mật khẩu mới tối thiểu 6 ký tự' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Mật khẩu xác nhận không khớp' }); return; }
    setPwBusy(true);
    try {
      await api.post('/auth/change-password', { oldPassword: oldPw, newPassword: newPw });
      setPwMsg({ ok: true, text: 'Đã đổi mật khẩu ✓' });
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } catch (e: any) { setPwMsg({ ok: false, text: e.message || 'Đổi mật khẩu thất bại' }); } finally { setPwBusy(false); }
  }

  async function startSetup() {
    setFaMsg(null); setFaBusy(true);
    try {
      const r = await api.post<{ secret: string; otpauth: string }>('/auth/2fa/setup');
      setSetup(r); setCode('');
    } catch (e: any) { setFaMsg({ ok: false, text: e.message }); } finally { setFaBusy(false); }
  }

  async function enable() {
    setFaMsg(null); setFaBusy(true);
    try {
      await api.post('/auth/2fa/enable', { code });
      setFaMsg({ ok: true, text: 'Đã bật 2FA ✓' });
      setSetup(null); setCode(''); setEnabled(true);
    } catch (e: any) { setFaMsg({ ok: false, text: e.message || 'Mã không đúng' }); } finally { setFaBusy(false); }
  }

  async function disable() {
    setFaMsg(null); setFaBusy(true);
    try {
      await api.post('/auth/2fa/disable', { code });
      setFaMsg({ ok: true, text: 'Đã tắt 2FA' });
      setCode(''); setEnabled(false);
    } catch (e: any) { setFaMsg({ ok: false, text: e.message || 'Mã không đúng' }); } finally { setFaBusy(false); }
  }

  if (authLoading) return <p className="text-ink-500">Đang tải...</p>;
  if (!user) return <p className="text-ink-500">Vui lòng đăng nhập.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Mật khẩu & Bảo mật</h1>

      {/* Đổi mật khẩu */}
      <div className="card space-y-3 p-5">
        <h2 className="flex items-center gap-1.5 font-semibold"><KeyRound size={16} /> Đổi mật khẩu</h2>
        <input type="password" className="input w-full" placeholder="Mật khẩu hiện tại" value={oldPw} onChange={(e) => setOldPw(e.target.value)} autoComplete="current-password" />
        <input type="password" className="input w-full" placeholder="Mật khẩu mới" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" />
        <input type="password" className="input w-full" placeholder="Nhập lại mật khẩu mới" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
        {pwMsg && <p className={`text-sm ${pwMsg.ok ? 'text-emerald-600' : 'text-rose-500'}`}>{pwMsg.text}</p>}
        <button className="btn-primary" onClick={changePassword} disabled={pwBusy || !oldPw || !newPw}>{pwBusy ? 'Đang đổi…' : 'Đổi mật khẩu'}</button>
      </div>

      {/* 2FA */}
      <div className="card space-y-3 p-5">
        <h2 className="flex items-center gap-1.5 font-semibold"><ShieldCheck size={16} /> Xác thực 2 lớp (2FA)
          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${enabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-ink-100 text-ink-500 dark:bg-ink-800'}`}>{enabled ? 'Đang bật' : 'Đang tắt'}</span>
        </h2>
        <p className="text-sm text-ink-500">Dùng ứng dụng Authenticator (Google Authenticator, Authy…) để tạo mã 6 số mỗi khi đăng nhập.</p>

        {!enabled && !setup && (
          <button className="btn-primary w-fit" onClick={startSetup} disabled={faBusy}>{faBusy ? 'Đang tạo…' : 'Bật 2FA'}</button>
        )}

        {!enabled && setup && (
          <div className="space-y-3 rounded-xl border border-ink-200/70 p-4 dark:border-ink-700">
            <p className="text-sm">1. Mở app Authenticator → thêm tài khoản → <b>Nhập khoá thủ công</b> với mã bí mật dưới đây:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-ink-100 px-3 py-2 text-sm font-mono dark:bg-ink-800">{setup.secret}</code>
              <button onClick={() => navigator.clipboard?.writeText(setup.secret)} className="btn-outline !py-2" title="Sao chép"><Copy size={15} /></button>
            </div>
            <p className="text-sm">2. Nhập mã 6 số app hiển thị để xác nhận:</p>
            <div className="flex gap-2">
              <input className="input w-40" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              <button className="btn-primary" onClick={enable} disabled={faBusy || code.length < 6}>Xác nhận bật</button>
            </div>
          </div>
        )}

        {enabled && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block text-sm text-ink-500">Nhập mã 6 số để tắt 2FA</label>
              <input className="input w-40" inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50" onClick={disable} disabled={faBusy || code.length < 6}>Tắt 2FA</button>
          </div>
        )}

        {faMsg && <p className={`text-sm ${faMsg.ok ? 'text-emerald-600' : 'text-rose-500'}`}>{faMsg.text}</p>}
      </div>
    </div>
  );
}
