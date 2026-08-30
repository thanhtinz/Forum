'use client';

import { useActionState, useState } from 'react';
import { choiSocDia, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, SOCDIA_MAX, SOCDIA_MIN } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';

const CUA = [
  { id: 1, ten: 'Chẵn', anh: 'chan.gif' },
  { id: 2, ten: 'Lẻ', anh: 'le.gif' },
];

/** Sóc đĩa: chọn chẵn hoặc lẻ, bát bốn đồng. */
export function SocDia({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiSocDia, {});
  const [chon, setChon] = useState(1);
  // Giữ mức cược qua các ván: `defaultValue` bật về mức tối thiểu sau mỗi
  // lượt, bắt người chơi gõ lại con số y hệt ván nào cũng như ván nào.
  const [cuoc, setCuoc] = useState(String(SOCDIA_MIN));
  const het = conLai <= 0;
  const ra = state.mat?.[0];
  const dong = state.mat?.slice(1) ?? [];

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={het}>
        <legend className="label mb-2">Đặt cửa</legend>
        <div className="grid max-w-sm grid-cols-2 gap-2">
          {CUA.map((c) => (
            <label key={c.id} className="cursor-pointer">
              <input type="radio" name="cua" value={c.id} checked={chon === c.id}
                onChange={() => setChon(c.id)} className="peer sr-only" />
              <span className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-colors',
                chon === c.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                  : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
              )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ANH}/socdia/${c.anh}`} alt={c.ten} className="h-10 w-auto object-contain" />
                {/* Chừa sẵn chỗ cho dấu tick: hiện nó ra rồi mới nới ô lên thì
                    hai cửa cao thấp lệch nhau ngay lúc mở bát. */}
                <span className="flex h-6 items-center">
                  {ra === c.id && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`${ANH}/socdia/dung.gif`} alt="cửa vừa mở" className="h-6 w-auto" />
                  )}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {dong.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
          <span className="retro-sub text-ink-400">Bát vừa mở</span>
          {dong.map((d, i) => (
            <span key={i} className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border-2 text-[11px] font-black',
              d === 1
                ? 'border-rose-400 bg-rose-100 text-rose-600 dark:bg-rose-950/50'
                : 'border-ink-300 bg-white text-ink-500 dark:border-ink-600 dark:bg-ink-900',
            )}>
              {d === 1 ? 'N' : 'S'}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Cược (điểm)</span>
          <input name="cuoc" type="number" min={SOCDIA_MIN} max={SOCDIA_MAX} value={cuoc} onChange={(e) => setCuoc(e.target.value)}
            disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dangChay || het} className="btn-primary disabled:opacity-60">
          {dangChay ? 'Đang xóc…' : 'Mở bát!'}
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
