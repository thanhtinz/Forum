'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function ResetForm() {
  const token = useSearchParams().get('token') || '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (pw.length < 8) { setErr('Mật khẩu tối thiểu 8 ký tự'); return; }
    if (pw !== pw2) { setErr('Mật khẩu nhập lại không khớp'); return; }
    setBusy(true);
    try { await api.post('/auth/reset-password', { token, password: pw }); setDone(true); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">Đặt lại mật khẩu</h1>
        {!token ? (
          <p className="mt-3 text-sm text-red-500">Liên kết không hợp lệ.</p>
        ) : done ? (
          <p className="mt-3 text-sm text-emerald-600">Đã đặt lại mật khẩu thành công! Bạn có thể <Link href="/login" className="font-medium underline">đăng nhập</Link> ngay.</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input className="input" type="password" placeholder="Mật khẩu mới" value={pw} onChange={(e) => setPw(e.target.value)} />
            <input className="input" type="password" placeholder="Nhập lại mật khẩu" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            {err && <p className="text-sm text-red-500">{err}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? '…' : 'Đặt lại mật khẩu'}</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><ResetForm /></Suspense>;
}
