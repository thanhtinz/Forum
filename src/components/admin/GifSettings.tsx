'use client';

import { useActionState, useState } from 'react';
import { Save, Wand2 } from 'lucide-react';
import { saveGifConfig, type GifSettingState } from '@/app/admin/actions';
import { ActionForm } from '@/components/ActionForm';

export interface GifSettingsProps {
  provider: 'tenor' | 'giphy';
  /** Chỉ báo đã có khoá hay chưa — không gửi khoá thật xuống trình duyệt. */
  hasKey: boolean;
  enabled: boolean;
}

export function GifSettings({ provider, hasKey, enabled }: GifSettingsProps) {
  const [state, action, pending] = useActionState<GifSettingState, FormData>(saveGifConfig, {});
  const [prov, setProv] = useState(provider);

  const docs = prov === 'giphy'
    ? { name: 'Giphy', url: 'https://developers.giphy.com/' }
    : { name: 'Tenor', url: 'https://developers.google.com/tenor/guides/quickstart' };

  return (
    <section className="card p-5">
      <p className="mb-4 flex items-start gap-2 text-sm text-ink-500">
        <Wand2 size={16} className="mt-0.5 shrink-0 text-brand-500" />
        <span>Bật tab GIF ở ô soạn trả lời. Khoá API chỉ nằm ở máy chủ, không gửi xuống trình duyệt người dùng.</span>
      </p>

      <ActionForm action={action} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Nhà cung cấp</span>
            <select name="provider" value={prov} onChange={(e) => setProv(e.target.value as 'tenor' | 'giphy')} className="input">
              <option value="tenor">Tenor (Google)</option>
              <option value="giphy">Giphy</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Khoá API</span>
            <input name="apiKey" type="password" autoComplete="off"
              placeholder={hasKey ? '•••••••• (nhập lại để thay)' : `Dán khoá ${docs.name} vào đây`}
              className="input" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={enabled} className="accent-brand-500" />
          Bật tab GIF cho thành viên
        </label>

        <p className="text-xs text-ink-400">
          Lấy khoá miễn phí tại{' '}
          <a href={docs.url} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
            trang nhà phát triển {docs.name}
          </a>.
        </p>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && <p className="text-sm text-green-600">Đã lưu cấu hình.</p>}

        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          <Save size={16} /> {pending ? 'Đang lưu…' : 'Lưu cấu hình'}
        </button>
      </ActionForm>
    </section>
  );
}
