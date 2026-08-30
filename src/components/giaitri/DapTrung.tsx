'use client';

import { useActionState, useState } from 'react';
import { choiDapTrung, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, TRUNG_MAX, TRUNG_MIN, TRUNG_SO } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';
import { dangDien, useMan } from './dung-man';

/** Đập trứng: năm quả giống hệt nhau, chọn một quả rồi đập. */
export function DapTrung({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiDapTrung, {});
  const [cuoc, setCuoc] = useState(String(TRUNG_MIN));
  const [chon, setChon] = useState(0);
  const het = conLai <= 0;

  const man = useMan(dangChay, state);
  const dien = dangDien(man);
  const xong = man === 'ketqua';
  const [co, vang] = xong || man === 'ketthuc' ? state.mat ?? [] : [];

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={het || dien}>
        <legend className="label mb-2">Chọn quả để đập</legend>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: TRUNG_SO }, (_, i) => {
            const laCua = i === chon;
            // Quả mình chọn rung lên ở màn diễn ra rồi nứt ở màn kết thúc;
            // bốn quả kia đứng yên như lúc chưa chơi.
            const rung = laCua && (man === 'batdau' || man === 'dienra');
            const vo = laCua && (man === 'ketthuc' || xong);
            const coQua = xong && i === co;
            return (
              <label key={i} className={cn('cursor-pointer', dien && 'cursor-wait')}>
                <input type="radio" name="trung" value={i} checked={laCua}
                  onChange={() => setChon(i)} className="peer sr-only" />
                <span className={cn(
                  'flex w-16 flex-col items-center gap-1 rounded-xl border-2 p-2 transition-colors',
                  laCua
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                    : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
                  coQua && 'border-amber-400 bg-amber-50 dark:bg-amber-950/40',
                )}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${ANH}/daptrung/${vo ? 'vo' : 'trung'}.png`} alt=""
                    className={cn('h-9 w-auto object-contain',
                      rung && 'trung-rung', man === 'ketthuc' && laCua && 'trung-vo')}
                    style={{ imageRendering: 'pixelated' }} />
                  <span className="text-xs font-semibold">
                    {xong && i === vang ? '★' : i}
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
          <input name="cuoc" type="number" min={TRUNG_MIN} max={TRUNG_MAX} value={cuoc}
            onChange={(e) => setCuoc(e.target.value)} disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dien || het} className="btn-primary disabled:opacity-60">
          {dien ? 'Đang đập…' : 'Đập!'}
        </button>
      </div>

      {xong && state.ke && (
        <p className={cn('man-hien text-sm font-medium',
          (state.delta ?? 0) > 0 ? 'text-emerald-600' : 'text-ink-600 dark:text-ink-300')}>
          {state.ke}
        </p>
      )}
      {state.error && !dien && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
