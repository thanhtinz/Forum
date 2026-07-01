'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function VerifyInner() {
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) { setState('error'); setMsg('Liên kết không hợp lệ.'); return; }
    api.post('/auth/verify-email', { token })
      .then(() => setState('ok'))
      .catch((e: any) => { setState('error'); setMsg(e.message || 'Xác thực thất bại'); });
  }, [token]);

  return (
    <div className="mx-auto max-w-sm py-12 text-center">
      <div className="card p-8">
        {state === 'loading' && <p className="text-ink-500">Đang xác thực email…</p>}
        {state === 'ok' && <>
          <h1 className="text-xl font-bold text-emerald-600">Xác thực thành công!</h1>
          <p className="mt-2 text-sm text-ink-500">Tài khoản của bạn đã được xác thực email.</p>
          <Link href="/" className="btn-primary mt-4 inline-block">Về trang chủ</Link>
        </>}
        {state === 'error' && <>
          <h1 className="text-xl font-bold text-red-500">Không xác thực được</h1>
          <p className="mt-2 text-sm text-ink-500">{msg}</p>
          <Link href="/" className="btn-outline mt-4 inline-block">Về trang chủ</Link>
        </>}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<div className="p-10 text-center text-ink-500">Đang tải…</div>}><VerifyInner /></Suspense>;
}
