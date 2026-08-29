'use client';

import { useActionState, useState } from 'react';
import { Check, Coins, X } from 'lucide-react';
import { traLoiCauHoi, type TraLoiState } from '@/app/(site)/giai-tri/trac-nghiem/actions';
import { QUIZ_NHAN } from '@/lib/quiz-const';
import { cn } from '@/lib/utils';

/**
 * Một câu hỏi bày ra để trả lời.
 *
 * Đáp án đúng KHÔNG có trong props — máy chủ chỉ gửi về sau khi đã ghi nhận
 * lượt trả lời. Trước lúc ấy, có mở mã nguồn trang ra cũng chẳng thấy gì.
 */
export function QuizCauHoi({ id, noiDung, phuongAn, coc, tacGia, soLuot }: {
  id: string;
  noiDung: string;
  phuongAn: string[];
  coc: number;
  tacGia: string;
  soLuot: number;
}) {
  const [state, action, dangChay] = useActionState<TraLoiState, FormData>(traLoiCauHoi, {});
  const [chon, setChon] = useState<number | null>(null);

  // Chỉ nhận kết quả đúng của câu này — mọi thẻ trên trang đều dùng chung
  // kiểu state, nhầm câu là hiện đáp án của câu khác.
  const xong = state.questionId === id;
  const dapAn = xong ? state.dapAn : undefined;

  return (
    <form action={action} className="card space-y-3 p-4">
      <input type="hidden" name="questionId" value={id} />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-semibold text-ink-800 dark:text-ink-100">{noiDung}</p>
        <span className="chip shrink-0 !py-0.5 bg-amber-50 text-[11px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          <Coins size={12} /> {coc} điểm
        </span>
      </div>

      <div className="grid gap-1.5">
        {phuongAn.map((p, i) => {
          const laDapAn = dapAn === i;
          const laChon = chon === i;
          return (
            <label key={i} className={cn('cursor-pointer', xong && 'cursor-default')}>
              <input type="radio" name="chon" value={i} checked={chon === i} disabled={xong}
                onChange={() => setChon(i)} className="sr-only" />
              <span className={cn(
                'flex items-start gap-2 rounded-xl border-2 px-3 py-2 text-sm transition-colors',
                xong && laDapAn
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                  : xong && laChon
                    ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40'
                    : laChon && !xong
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                      : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
              )}>
                <b className="shrink-0 text-ink-400">{QUIZ_NHAN[i]}.</b>
                <span className="min-w-0">{p}</span>
                {xong && laDapAn && <Check size={16} className="ml-auto shrink-0 text-emerald-600" />}
                {xong && laChon && !laDapAn && <X size={16} className="ml-auto shrink-0 text-rose-600" />}
              </span>
            </label>
          );
        })}
      </div>

      {!xong && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={dangChay || chon === null}
            className="btn-primary disabled:opacity-60">
            {dangChay ? 'Đang gửi…' : 'Trả lời'}
          </button>
          <span className="retro-sub text-ink-400">
            {tacGia} ra câu · {soLuot} lượt trả lời
          </span>
        </div>
      )}

      {xong && (
        <div className={cn(
          'rounded-xl p-3 text-sm',
          state.dung
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
            : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200',
        )}>
          <p className="font-semibold">{state.ke}</p>
          {state.giaiThich && <p className="mt-1 opacity-90">Giải thích: {state.giaiThich}</p>}
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
