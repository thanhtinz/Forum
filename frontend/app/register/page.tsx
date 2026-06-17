'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Captcha } from '@/components/Captcha';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '', inviteCode: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaOn, setCaptchaOn] = useState(false);

  function upd(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (captchaOn && !captchaToken) { setErr('Vui lòng xác minh CAPTCHA.'); return; }
    setBusy(true);
    try { await register({ ...form, captchaToken: captchaToken || undefined }); router.push('/'); }
    catch (e: any) { setErr(e.message || 'Đăng ký thất bại'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-sm py-8">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-bold">Đăng ký</h1>
        <p className="mb-5 text-sm text-ink-500">Tạo tài khoản mới miễn phí</p>
        <form onSubmit={submit} className="space-y-3">
          <input className="input" placeholder="Tên đăng nhập" value={form.username} onChange={upd('username')} />
          <input className="input" type="email" placeholder="Email" value={form.email} onChange={upd('email')} />
          <input className="input" type="password" placeholder="Mật khẩu" value={form.password} onChange={upd('password')} />
          <input className="input" placeholder="Mã mời (không bắt buộc)" value={form.inviteCode} onChange={upd('inviteCode')} />
          <Captcha onToken={setCaptchaToken} onConfig={setCaptchaOn} />
          {err && <p className="text-sm text-red-500">{err}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? '…' : 'Đăng ký'}</button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-500">
          Đã có tài khoản? <Link href="/login" className="font-medium text-brand-600">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
