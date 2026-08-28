'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { PixelIcon } from '@/components/PixelIcon';
import {
  POLL_DURATIONS, POLL_MAX_OPTIONS, POLL_MIN_OPTIONS,
  POLL_OPTION_MAX, POLL_QUESTION_MAX,
} from '@/lib/poll';

/**
 * Phần thêm bình chọn khi đăng chủ đề.
 *
 * Mặc định gập lại: đa số chủ đề không cần bình chọn, mở ra mới hiện các ô.
 * Gập lại thì bỏ luôn các ô khỏi form nên máy chủ hiểu là không tạo bình chọn.
 */
export function PollBuilder() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([0, 1]);
  const [next, setNext] = useState(2);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="btn-outline w-full justify-center gap-2 !py-2.5 text-sm">
        <PixelIcon name="binhChon" /> Thêm bình chọn
      </button>
    );
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-ink-900 dark:text-white">
          <PixelIcon name="binhChon" /> Bình chọn
        </h3>
        <button type="button" onClick={() => setOpen(false)} title="Bỏ bình chọn"
          className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Câu hỏi</span>
        <input name="pollQuestion" maxLength={POLL_QUESTION_MAX} className="input"
          placeholder="Ví dụ: Bạn thích giao diện nào hơn?" />
      </label>

      <div className="space-y-2">
        <span className="block text-sm font-medium">Các lựa chọn</span>
        {rows.map((key, i) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-xs text-ink-400">{i + 1}</span>
            <input name="pollOption" maxLength={POLL_OPTION_MAX} className="input flex-1"
              placeholder={`Lựa chọn ${i + 1}`} />
            <button type="button" title="Bớt lựa chọn"
              disabled={rows.length <= POLL_MIN_OPTIONS}
              onClick={() => setRows((r) => r.filter((k) => k !== key))}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 disabled:opacity-30 dark:hover:bg-ink-800">
              <X size={15} />
            </button>
          </div>
        ))}
        {rows.length < POLL_MAX_OPTIONS && (
          <button type="button" onClick={() => { setRows((r) => [...r, next]); setNext((n) => n + 1); }}
            className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
            <Plus size={15} /> Thêm lựa chọn
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Thời hạn</span>
          <select name="pollHours" className="input" defaultValue={0}>
            {POLL_DURATIONS.map((d) => <option key={d.hours} value={d.hours}>{d.label}</option>)}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="pollMultiple" className="size-4 accent-brand-500" />
          Cho chọn nhiều đáp án
        </label>
      </div>
    </div>
  );
}
