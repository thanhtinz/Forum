'use client';

import { useActionState, useState } from 'react';
import { Check, X } from 'lucide-react';
import { traLoiCauHoi, type TraLoiState } from '@/app/(site)/giai-tri/trac-nghiem/actions';
import { QUIZ_NHAN } from '@/lib/quiz-const';
import { cn } from '@/lib/utils';

/**
 * Ô chọn đáp án của một câu hỏi — bản gốc là bốn nút tròn với một nút "Trả lời".
 *
 * Đáp án đúng KHÔNG có trong props: máy chủ chỉ gửi về sau khi đã ghi nhận lượt
 * trả lời. Trước lúc ấy, có mở mã nguồn trang ra cũng chẳng thấy gì.
 *
 * Trả lời xong, `revalidatePath` trong action làm trang máy chủ dựng lại ở bản
 * "đã trả lời" và thẻ này biến mất. Vẫn tự bày kết quả từ state, vì nếu vì cớ
 * gì đó trang chưa kịp dựng lại thì người chơi phải thấy ngay mình đúng hay
 * sai, chứ không đứng nhìn một cái nút vừa bấm.
 */
export function QuizCauHoi({ id, phuongAn }: { id: string; phuongAn: string[] }) {
  const [state, action, dangChay] = useActionState<TraLoiState, FormData>(traLoiCauHoi, {});
  const [chon, setChon] = useState<number | null>(null);

  const xong = state.questionId === id;
  const dapAn = xong ? state.dapAn : undefined;

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="questionId" value={id} />

      <div className="grid gap-1.5">
        {phuongAn.map((p, i) => {
          const laDapAn = dapAn === i;
          const laChon = chon === i;
          return (
            <label key={i} className={cn('block', xong ? 'cursor-default' : 'cursor-pointer')}>
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
        <button type="submit" disabled={dangChay || chon === null}
          className="btn-primary disabled:opacity-60">
          {dangChay ? 'Đang gửi…' : 'Trả lời'}
        </button>
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
