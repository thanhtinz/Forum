'use client';

import { useActionState } from 'react';
import { Save } from 'lucide-react';
import { saveSiteSettings, type SiteState } from '@/app/admin/actions';
import type { SiteSettings } from '@/lib/site';
import { ActionForm } from '@/components/ActionForm';
import { IconField } from '@/components/admin/IconField';

export function SiteSettingsForm({ initial }: { initial: SiteSettings }) {
  const [state, action, pending] = useActionState<SiteState, FormData>(saveSiteSettings, {});

  return (
    <ActionForm action={action} className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tên trang</span>
          <input name="name" defaultValue={initial.name} className="input" placeholder="Nova" />
          <span className="mt-1 block text-xs text-ink-400">Hiện cạnh logo trên đầu trang.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Khẩu hiệu</span>
          <input name="tagline" defaultValue={initial.tagline} className="input" placeholder="Để trống thì không hiện" />
        </label>

        <IconField name="logo" label="Logo" className="sm:col-span-2" defaultValue={initial.logo}
          fallback={<span className="text-base font-black">{initial.name.charAt(0).toUpperCase()}</span>}
          placeholder="Dán link ảnh hoặc tải ảnh lên"
          hint="Để trống thì hiện chữ cái đầu của tên trang." />

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Mô tả trang</span>
          <textarea name="description" defaultValue={initial.description} rows={2} className="input"
            placeholder="Mô tả ngắn cho công cụ tìm kiếm và khi chia sẻ link." />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">Dòng chân trang</span>
          <input name="footerText" defaultValue={initial.footerText} className="input" placeholder="Nova Platform. Nền tảng blog + diễn đàn." />
          <span className="mt-1 block text-xs text-ink-400">Năm bản quyền được thêm tự động phía trước.</span>
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-green-600">Đã lưu cài đặt.</p>}

      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
        <Save size={16} /> {pending ? 'Đang lưu…' : 'Lưu cài đặt'}
      </button>
    </ActionForm>
  );
}
