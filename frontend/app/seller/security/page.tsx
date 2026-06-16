'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

export default function SellerSecurity() {
  const [f, setF] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState('');
  async function save() {
    setMsg('');
    if (f.newPassword !== f.confirm) { setMsg('Mật khẩu xác nhận không khớp'); return; }
    try { await api.post('/auth/change-password', { oldPassword: f.oldPassword, newPassword: f.newPassword }); setMsg('Đổi mật khẩu thành công ✓'); setF({ oldPassword: '', newPassword: '', confirm: '' }); }
    catch (e: any) { setMsg(e.message); }
  }
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck /> Bảo mật</h1>
      <div className="card space-y-3 p-5">
        <h2 className="font-semibold">Đổi mật khẩu</h2>
        <input type="password" className="input" placeholder="Mật khẩu hiện tại" value={f.oldPassword} onChange={(e) => setF({ ...f, oldPassword: e.target.value })} />
        <input type="password" className="input" placeholder="Mật khẩu mới" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} />
        <input type="password" className="input" placeholder="Xác nhận mật khẩu mới" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
        <button onClick={save} className="btn-primary">Cập nhật</button>
        {msg && <p className="text-sm text-brand-600">{msg}</p>}
      </div>
      <div className="card p-5 text-sm text-ink-500">
        <p>🔒 2FA, quản lý thiết bị và nhật ký đăng nhập sẽ sớm có.</p>
      </div>
    </div>
  );
}
