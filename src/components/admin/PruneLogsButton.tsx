'use client';

import { useState, useTransition } from 'react';
import { Eraser } from 'lucide-react';
import { pruneLogs } from '@/app/admin/actions';

const OPTIONS = [
  { days: 90, label: 'cũ hơn 90 ngày' },
  { days: 180, label: 'cũ hơn 180 ngày' },
  { days: 365, label: 'cũ hơn 1 năm' },
];

/** Dọn nhật ký cũ — xoá hẳn nên luôn hỏi lại trước khi chạy. */
export function PruneLogsButton() {
  const [days, setDays] = useState(180);
  const [pending, start] = useTransition();
  const label = OPTIONS.find((o) => o.days === days)?.label ?? '';

  return (
    <div className="flex items-center gap-2">
      <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="input !w-auto !py-1.5 text-sm">
        {OPTIONS.map((o) => <option key={o.days} value={o.days}>Xoá bản ghi {o.label}</option>)}
      </select>
      <button type="button" disabled={pending}
        onClick={() => {
          if (confirm(`Xoá vĩnh viễn mọi bản ghi nhật ký ${label}?`)) start(() => { void pruneLogs(days); });
        }}
        className="flex items-center gap-1.5 rounded-lg border border-rose-300 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:hover:bg-rose-950">
        <Eraser size={15} /> Dọn
      </button>
    </div>
  );
}
