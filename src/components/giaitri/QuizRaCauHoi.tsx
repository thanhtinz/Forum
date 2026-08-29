'use client';

import { useActionState, useState } from 'react';
import { dangCauHoi, type RaCauState } from '@/app/(site)/giai-tri/trac-nghiem/actions';
import {
  QUIZ_COC_MAX, QUIZ_COC_MIN, QUIZ_GIAI_THICH_MAX, QUIZ_NHAN, QUIZ_NOI_DUNG_MAX,
  QUIZ_PHUONG_AN_MAX, QUIZ_SO_PHUONG_AN,
} from '@/lib/quiz-const';
import { cn } from '@/lib/utils';

/** Biểu mẫu ra câu hỏi mới: bốn phương án, chọn một đáp án đúng, đặt cọc. */
export function QuizRaCauHoi() {
  const [state, action, dangChay] = useActionState<RaCauState, FormData>(dangCauHoi, {});
  const [dapAn, setDapAn] = useState(0);

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="label">Câu hỏi</span>
        <textarea name="noiDung" rows={3} maxLength={QUIZ_NOI_DUNG_MAX} required
          placeholder="Hỏi thứ gì đó có đáp án rõ ràng, đừng đánh đố vô lý."
          className="input" />
      </label>

      <fieldset>
        <legend className="label mb-2">
          Bốn phương án — bấm chấm tròn để đánh dấu đáp án đúng
        </legend>
        <div className="space-y-2">
          {Array.from({ length: QUIZ_SO_PHUONG_AN }, (_, i) => (
            <div key={i} className={cn(
              'flex items-center gap-2 rounded-xl border-2 px-2 py-1.5 transition-colors',
              dapAn === i
                ? 'border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30'
                : 'border-ink-200 dark:border-ink-700',
            )}>
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5">
                <input type="radio" name="dapAn" value={i} checked={dapAn === i}
                  onChange={() => setDapAn(i)} className="h-4 w-4 accent-emerald-500" />
                <b className="text-sm text-ink-500">{QUIZ_NHAN[i]}</b>
              </label>
              <input name={`phuongAn${i}`} required maxLength={QUIZ_PHUONG_AN_MAX}
                placeholder={`Phương án ${QUIZ_NHAN[i]}`}
                className="input !border-0 !bg-transparent !py-1 !shadow-none" />
            </div>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="label">Giải thích (không bắt buộc)</span>
        <textarea name="giaiThich" rows={2} maxLength={QUIZ_GIAI_THICH_MAX}
          placeholder="Hiện ra sau khi người ta trả lời xong."
          className="input" />
      </label>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Đặt cọc (điểm)</span>
          <input name="coc" type="number" min={QUIZ_COC_MIN} max={QUIZ_COC_MAX}
            defaultValue={QUIZ_COC_MIN} className="input !w-32" />
        </label>
        <button type="submit" disabled={dangChay} className="btn-primary disabled:opacity-60">
          {dangChay ? 'Đang gửi…' : 'Gửi câu hỏi'}
        </button>
        <span className="retro-sub text-ink-400">
          Trừ cọc ngay, bị từ chối cũng không hoàn
        </span>
      </div>

      {state.ke && <p className="text-sm font-medium text-emerald-600">{state.ke}</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
