'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { LogIn, User, Lock } from 'lucide-react';
import { loginAction, type AuthFormState } from '@/app/(auth)/actions';
import { ActionForm } from '@/components/ActionForm';

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(loginAction, {});
  const registerHref = `/register${callbackUrl !== '/' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;

  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-xl font-bold">Đăng nhập</h1>
      <p className="mt-1 text-sm text-ink-500">Chào mừng bạn quay lại Nova.</p>

      <ActionForm action={action} className="mt-6 space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email hoặc tên đăng nhập</span>
          <span className="relative block">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="identifier" required autoComplete="username" className="input pl-9" placeholder="email@vidu.com" />
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Mật khẩu</span>
          <span className="relative block">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="password" type="password" required autoComplete="current-password" className="input pl-9" placeholder="••••••••" />
          </span>
        </label>

        {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full py-2.5 disabled:opacity-60">
          <LogIn size={16} /> {pending ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </ActionForm>

      <p className="mt-5 text-center text-sm text-ink-500">
        Chưa có tài khoản?{' '}
        <Link href={registerHref} className="font-semibold text-brand-600 hover:underline">Đăng ký ngay</Link>
      </p>
    </div>
  );
}
