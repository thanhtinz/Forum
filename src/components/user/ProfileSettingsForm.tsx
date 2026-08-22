'use client';

import { useActionState } from 'react';
import { updateProfile, changePassword, type SettingsState } from '@/app/(site)/user/settings/actions';
import { ActionForm } from '@/components/ActionForm';

export interface ProfileInitial {
  name: string | null;
  username: string | null;
  bio: string | null;
  image: string | null;
  cover: string | null;
  hasPassword: boolean;
}

export function ProfileSettingsForm({ initial }: { initial: ProfileInitial }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateProfile, {});
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <ActionForm action={action} className="card space-y-3 p-5">
      <h2 className="font-bold">Hồ sơ công khai</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên hiển thị" error={err('name')}>
          <input name="name" required defaultValue={initial.name ?? ''} className="input" placeholder="Nguyễn Văn A" />
        </Field>
        <Field label="Tên đăng nhập" error={err('username')} hint="Dùng cho địa chỉ trang cá nhân /u/…">
          <input name="username" required defaultValue={initial.username ?? ''} className="input" placeholder="nguyenvana" />
        </Field>
        <Field label="Ảnh đại diện (URL)" error={err('image')}>
          <input name="image" defaultValue={initial.image ?? ''} className="input" placeholder="https://…/avatar.jpg" />
        </Field>
        <Field label="Ảnh bìa (URL)" error={err('cover')}>
          <input name="cover" defaultValue={initial.cover ?? ''} className="input" placeholder="https://…/cover.jpg" />
        </Field>
      </div>

      <Field label="Giới thiệu" error={err('bio')} hint="Tối đa 300 ký tự">
        <textarea name="bio" rows={3} defaultValue={initial.bio ?? ''} className="input" placeholder="Đôi dòng về bạn…" />
      </Field>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Đã lưu hồ sơ.</p>}

      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
    </ActionForm>
  );
}

export function PasswordForm({ hasPassword, username }: { hasPassword: boolean; username?: string | null }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(changePassword, {});
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <ActionForm action={action} className="card space-y-3 p-5">
      <h2 className="font-bold">{hasPassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}</h2>
      {/* Trình quản lý mật khẩu cần biết tài khoản nào đang đổi */}
      <input type="text" name="username" autoComplete="username" defaultValue={username ?? ''} readOnly hidden aria-hidden="true" tabIndex={-1} />
      {!hasPassword && (
        <p className="text-sm text-ink-500">Tài khoản của bạn đang đăng nhập qua mạng xã hội. Đặt mật khẩu để có thể đăng nhập bằng email.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {hasPassword && (
          <Field label="Mật khẩu hiện tại" error={err('current')}>
            <input name="current" type="password" className="input" autoComplete="current-password" />
          </Field>
        )}
        <Field label="Mật khẩu mới" error={err('next')}>
          <input name="next" type="password" required className="input" autoComplete="new-password" />
        </Field>
        <Field label="Nhập lại mật khẩu mới" error={err('confirm')}>
          <input name="confirm" type="password" required className="input" autoComplete="new-password" />
        </Field>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Đã cập nhật mật khẩu.</p>}

      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? 'Đang lưu…' : 'Cập nhật mật khẩu'}</button>
    </ActionForm>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span>
        : hint ? <span className="mt-1 block text-xs text-ink-400">{hint}</span> : null}
    </label>
  );
}
