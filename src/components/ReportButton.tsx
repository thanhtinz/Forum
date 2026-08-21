'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { Flag, X, CheckCircle2 } from 'lucide-react';
import { createReport, type ReportState, type ReportTarget } from '@/app/(site)/report/actions';

const REASONS = ['Nội dung vi phạm', 'Spam / quảng cáo', 'Nội dung không phù hợp', 'Vi phạm bản quyền', 'Lừa đảo', 'Khác'];

export function ReportButton({ target, targetId, className }: { target: ReportTarget; targetId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReportState, FormData>(createReport, {});

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className={className ?? 'inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-red-500'}>
        <Flag size={15} /> Báo cáo
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-ink-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold text-ink-900 dark:text-white"><Flag size={18} className="text-red-500" /> Báo cáo nội dung</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-600"><X size={18} /></button>
            </div>

            {state.ok ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 size={38} className="text-emerald-500" />
                <p className="font-semibold">Đã gửi báo cáo</p>
                <p className="text-sm text-ink-500">Cảm ơn bạn. Đội ngũ quản trị sẽ xem xét sớm.</p>
                <button type="button" onClick={() => setOpen(false)} className="btn-ghost mt-2">Đóng</button>
              </div>
            ) : (
              <form action={action} className="space-y-3">
                <input type="hidden" name="target" value={target} />
                <input type="hidden" name="targetId" value={targetId} />
                <div className="space-y-1.5">
                  {REASONS.map((r) => (
                    <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 dark:border-ink-700 dark:has-[:checked]:bg-brand-950/30">
                      <input type="radio" name="reason" value={r} required className="accent-brand-500" /> {r}
                    </label>
                  ))}
                </div>
                <textarea name="detail" rows={3} placeholder="Mô tả thêm (không bắt buộc)…"
                  className="input resize-none" />
                {state.error && <p className="text-sm text-red-600">{state.error}</p>}
                <button type="submit" disabled={pending} className="btn w-full bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                  {pending ? 'Đang gửi…' : 'Gửi báo cáo'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
