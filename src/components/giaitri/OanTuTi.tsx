'use client';

import { useActionState, useState } from 'react';
import { choiOanTuTi, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, OTT_MAX, OTT_MIN, OTT_TAY } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';

/** Oẳn tù tì với máy, dùng đúng ba icon bàn tay của bản cũ. */
export function OanTuTi({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiOanTuTi, {});
  const [chon, setChon] = useState(1);
  // Giữ mức cược qua các ván: `defaultValue` bật về mức tối thiểu sau mỗi
  // lượt, bắt người chơi gõ lại con số y hệt ván nào cũng như ván nào.
  const [cuoc, setCuoc] = useState(String(OTT_MIN));
  const het = conLai <= 0;
  const may = state.mat?.[0];

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={het}>
        <legend className="label mb-2">Ra tay</legend>
        <div className="grid max-w-md grid-cols-3 gap-2">
          {OTT_TAY.map((t) => (
            <label key={t.id} className="cursor-pointer">
              <input type="radio" name="tay" value={t.id} checked={chon === t.id}
                onChange={() => setChon(t.id)} className="peer sr-only" />
              <span className={cn(
                'flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-colors',
                chon === t.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                  : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
              )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ANH}/ott/${t.anh}`} alt="" className="h-12 w-auto object-contain" />
                <span className="text-xs font-semibold">{t.ten}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Cược (điểm)</span>
          <input name="cuoc" type="number" min={OTT_MIN} max={OTT_MAX} value={cuoc} onChange={(e) => setCuoc(e.target.value)}
            disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dangChay || het} className="btn-primary disabled:opacity-60">
          {dangChay ? 'Đang ra tay…' : 'Oẳn tù tì!'}
        </button>
      </div>

      {may && (
        <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
          <span className="retro-sub text-ink-400">Máy ra</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ANH}/ott/${OTT_TAY.find((t) => t.id === may)!.anh}`} alt=""
            className="h-12 w-auto object-contain" />
          <b className="text-sm">{OTT_TAY.find((t) => t.id === may)!.ten}</b>
        </div>
      )}
      {state.ke && (
        <p className={cn('text-sm font-medium', (state.delta ?? 0) > 0 ? 'text-emerald-600' : 'text-ink-600 dark:text-ink-300')}>
          {state.ke}
        </p>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
