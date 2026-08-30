'use client';

import { useActionState, useState } from 'react';
import { choiDapTrung, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, TRUNG_MAX, TRUNG_MIN, TRUNG_SO } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';

/** Đập trứng: năm quả giống hệt nhau, chọn một quả rồi đập. */
export function DapTrung({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiDapTrung, {});
  const [chon, setChon] = useState(0);
  // Giữ mức cược qua các ván: `defaultValue` bật về mức tối thiểu sau mỗi
  // lượt, bắt người chơi gõ lại con số y hệt ván nào cũng như ván nào.
  const [cuoc, setCuoc] = useState(String(TRUNG_MIN));
  const het = conLai <= 0;
  const [co, vang] = state.mat ?? [];
  const daDap = state.mat !== undefined;

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={het}>
        <legend className="label mb-2">Chọn quả để đập</legend>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: TRUNG_SO }, (_, i) => {
            // Chỉ quả VỪA đập mới nứt; bốn quả kia còn nguyên như lúc chưa chơi.
            const vo = daDap && i === chon;
            const coQua = daDap && i === co;
            return (
              <label key={i} className="cursor-pointer">
                <input type="radio" name="trung" value={i} checked={chon === i}
                  onChange={() => setChon(i)} className="peer sr-only" />
                <span className={cn(
                  'flex w-16 flex-col items-center gap-1 rounded-xl border-2 p-2 transition-colors',
                  chon === i
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                    : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
                  coQua && 'border-amber-400 bg-amber-50 dark:bg-amber-950/40',
                )}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${ANH}/daptrung/${vo ? 'vo' : 'trung'}.png`} alt=""
                    className="h-9 w-auto object-contain" style={{ imageRendering: 'pixelated' }} />
                  <span className="text-xs font-semibold">
                    {daDap && i === vang ? '★' : i}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Cược (điểm)</span>
          <input name="cuoc" type="number" min={TRUNG_MIN} max={TRUNG_MAX} value={cuoc} onChange={(e) => setCuoc(e.target.value)}
            disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dangChay || het} className="btn-primary disabled:opacity-60">
          {dangChay ? 'Đang đập…' : 'Đập!'}
        </button>
      </div>

      {state.ke && (
        <p className={cn('text-sm font-medium',
          (state.delta ?? 0) > 0 ? 'text-emerald-600' : 'text-ink-600 dark:text-ink-300')}>
          {state.ke}
        </p>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
