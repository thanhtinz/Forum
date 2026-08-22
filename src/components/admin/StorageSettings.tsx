'use client';

import { useActionState } from 'react';
import { Cloud, Save, HardDrive } from 'lucide-react';
import { saveR2Config, type R2State } from '@/app/admin/actions';

export interface StorageSettingsProps {
  accountId: string;
  bucket: string;
  publicUrl: string;
  accessKeyId: string;
  hasSecret: boolean;
  enabled: boolean;
  /** Cấu hình đến từ biến môi trường thì không sửa được ở đây. */
  fromEnv: boolean;
}

export function StorageSettings(p: StorageSettingsProps) {
  const [state, action, pending] = useActionState<R2State, FormData>(saveR2Config, {});

  return (
    <section className="card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Cloud size={18} className="text-brand-500" />
        <h2 className="font-bold text-ink-900 dark:text-white">Cloudflare R2</h2>
        <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${p.enabled
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'bg-ink-200 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
          {p.enabled ? 'Đang dùng R2' : 'Đang lưu trên máy chủ'}
        </span>
      </div>
      <p className="mb-4 text-sm text-ink-500">
        Bật để ảnh người dùng tải lên và sticker được lưu trên Cloudflare R2 thay vì đĩa máy chủ.
      </p>

      {p.fromEnv ? (
        <p className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2.5 text-sm text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
          <HardDrive size={16} className="mt-0.5 shrink-0" />
          Cấu hình đang lấy từ biến môi trường (<code className="font-mono text-xs">R2_*</code>) nên không sửa được ở đây.
          Muốn đổi thì sửa biến môi trường rồi khởi động lại máy chủ.
        </p>
      ) : (
        <form action={action} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Account ID</span>
              <input name="accountId" defaultValue={p.accountId} className="input" placeholder="vd: 8f1c…" autoComplete="off" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Bucket</span>
              <input name="bucket" defaultValue={p.bucket} className="input" placeholder="nova-media" autoComplete="off" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Access Key ID</span>
              <input name="accessKeyId" defaultValue={p.accessKeyId} className="input" autoComplete="off" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Secret Access Key</span>
              <input name="secretAccessKey" type="password" className="input" autoComplete="off"
                placeholder={p.hasSecret ? '•••••••• (để trống nếu giữ nguyên)' : 'Dán secret vào đây'} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium">Địa chỉ công khai</span>
              <input name="publicUrl" defaultValue={p.publicUrl} className="input"
                placeholder="https://pub-xxxx.r2.dev hoặc https://cdn.tencuaban.com" autoComplete="off" />
              <span className="mt-1 block text-xs text-ink-400">
                Bật Public Access cho bucket (hoặc nối domain riêng) rồi dán địa chỉ đó vào đây.
              </span>
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={p.enabled} className="accent-brand-500" />
            Dùng R2 để lưu ảnh
          </label>

          <p className="text-xs text-ink-400">
            Lấy khoá tại Cloudflare → R2 → <b>Manage R2 API Tokens</b>, chọn quyền <b>Object Read &amp; Write</b> cho bucket.
          </p>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state.ok && <p className="text-sm text-green-600">Đã lưu cấu hình.</p>}

          <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
            <Save size={16} /> {pending ? 'Đang lưu…' : 'Lưu cấu hình'}
          </button>
        </form>
      )}
    </section>
  );
}
