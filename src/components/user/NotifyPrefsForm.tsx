'use client';

import { useActionState } from 'react';
import { BellRing } from 'lucide-react';
import { updateNotifyPrefs, type SettingsState } from '@/app/(site)/user/settings/actions';
import { TOGGLEABLE_TYPES, NOTIFY_LABELS } from '@/lib/notify-types';
import { ActionForm } from '@/components/ActionForm';

/**
 * Bật/tắt từng loại thông báo.
 *
 * Ô nào bỏ tick thì loại đó không còn tạo thông báo nữa — lọc ngay lúc ghi chứ
 * không phải chỉ giấu đi, nên chuông cũng không đếm.
 */
export function NotifyPrefsForm({ off }: { off: string[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateNotifyPrefs, {});

  return (
    <ActionForm action={action} className="card space-y-3 p-5">
      <div className="flex items-center gap-2">
        <BellRing size={18} className="text-brand-500" />
        <h2 className="font-bold">Thông báo</h2>
      </div>
      <p className="text-sm text-ink-500">
        Chọn loại thông báo bạn muốn nhận. Thông báo về đơn hàng, VIP và thông báo từ ban quản trị
        luôn được gửi nên không tắt được.
      </p>

      <div className="divide-y divide-ink-100 dark:divide-ink-800">
        {TOGGLEABLE_TYPES.map((t) => (
          <label key={t} className="flex cursor-pointer items-start gap-3 py-2.5">
            <input type="checkbox" name="on" value={t} defaultChecked={!off.includes(t)}
              className="mt-0.5 size-4 shrink-0 accent-brand-500" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink-900 dark:text-white">{NOTIFY_LABELS[t].label}</span>
              <span className="block text-xs text-ink-400">{NOTIFY_LABELS[t].hint}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">
          {pending ? 'Đang lưu…' : 'Lưu thay đổi'}
        </button>
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.ok && <span className="text-sm text-green-600">Đã lưu cài đặt thông báo.</span>}
      </div>
    </ActionForm>
  );
}
