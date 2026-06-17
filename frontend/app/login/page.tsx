'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setP] = useState('');
  const [code, setCode] = useState('');
  const [need2fa, setNeed2fa] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try { await login(email, password, code || undefined); router.push('/'); }
    catch (e: any) {
      if (e.message === '2FA_REQUIRED') { setNeed2fa(true); setErr('Nhập mã 2FA từ ứng dụng xác thực'); }
      else setErr(e.message || 'Đăng nhập thất bại');
    }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">Đăng nhập</h1>
        <p className="mb-5 text-sm text-ink-500">Chào mừng quay lại ForumHub</p>
        <form onSubmit={submit} className="space-y-3">
          <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" type="password" placeholder="Mật khẩu" value={password} onChange={(e) => setP(e.target.value)} />
          {need2fa && <input className="input" placeholder="Mã 2FA (6 số)" value={code} onChange={(e) => setCode(e.target.value)} />}
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? '…' : 'Đăng nhập'}</button>
        </form>
        <p className="mt-3 text-center text-sm">
          <Link href="/forgot-password" className="text-ink-500 hover:text-brand-600">Quên mật khẩu?</Link>
        </p>
        <p className="mt-1 text-center text-sm text-ink-500">
          Chưa có tài khoản? <Link href="/register" className="font-medium text-brand-600">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}
