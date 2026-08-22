'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { UserPlus, User, Mail, Lock } from 'lucide-react';
import { registerAction, type AuthFormState } from '@/app/(auth)/actions';
import { ActionForm } from '@/components/ActionForm';

export function RegisterForm({ callbackUrl, inviteCode }: { callbackUrl: string; inviteCode?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(registerAction, {});
  const fe = state.fieldErrors ?? {};
  const loginHref = `/login${callbackUrl !== '/' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;

  return (
    <div className="card p-6 sm:p-8">
      <h1 className="text-xl font-bold">Tạo tài khoản</h1>
      <p className="mt-1 text-sm text-ink-500">Tham gia cộng đồng Nova miễn phí.</p>

      <ActionForm action={action} className="mt-6 space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        {inviteCode && <input type="hidden" name="ref" value={inviteCode} />}

        <Field name="username" label="Tên đăng nhập" icon={<User size={16} />} placeholder="nguyenvana" autoComplete="username" error={fe.username} />
        <Field name="email" label="Email" type="email" icon={<Mail size={16} />} placeholder="email@vidu.com" autoComplete="email" error={fe.email} />
        <Field name="password" label="Mật khẩu" type="password" icon={<Lock size={16} />} placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" error={fe.password} />

        {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn-primary w-full py-2.5 disabled:opacity-60">
          <UserPlus size={16} /> {pending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
        </button>
      </ActionForm>

      <p className="mt-5 text-center text-sm text-ink-500">
        Đã có tài khoản?{' '}
        <Link href={loginHref} className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link>
      </p>
    </div>
  );
}

function Field({ name, label, icon, placeholder, type = 'text', autoComplete, error }: {
  name: string; label: string; icon: React.ReactNode; placeholder?: string; type?: string; autoComplete?: string; error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <span className="relative block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>
        <input name={name} type={type} required autoComplete={autoComplete} placeholder={placeholder}
          className={`input pl-9 ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400/20' : ''}`} />
      </span>
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
