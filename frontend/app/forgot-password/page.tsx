'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await api.post('/auth/forgot-password', { email }); setDone(true); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">Quên mật khẩu</h1>
        {done ? (
          <p className="mt-3 text-sm text-ink-600 dark:text-ink-300">
            Nếu email tồn tại trong hệ thống, chúng tôi đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư (và mục spam).
          </p>
        ) : (
          <>
            <p className="mb-5 text-sm text-ink-500">Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.</p>
            <form onSubmit={submit} className="space-y-3">
              <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {err && <p className="text-sm text-red-500">{err}</p>}
              <button className="btn-primary w-full" disabled={busy}>{busy ? '…' : 'Gửi liên kết'}</button>
            </form>
          </>
        )}
        <p className="mt-4 text-center text-sm text-ink-500"><Link href="/login" className="font-medium text-brand-600">Quay lại đăng nhập</Link></p>
      </div>
    </div>
  );
}
