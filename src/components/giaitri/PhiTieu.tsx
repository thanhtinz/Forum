'use client';

import { useActionState, useState } from 'react';
import { choiPhiTieu, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, PHITIEU_MAX, PHITIEU_MIN } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';

/** Phi tiêu: không chọn gì cả, cứ ném rồi so điểm với máy — y bản cũ. */
export function PhiTieu({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiPhiTieu, {});
  // Giữ mức cược qua các ván: `defaultValue` bật về mức tối thiểu sau mỗi
  // lượt, bắt người chơi gõ lại con số y hệt ván nào cũng như ván nào.
  const [cuoc, setCuoc] = useState(String(PHITIEU_MIN));
  const het = conLai <= 0;
  const [toi, may] = state.mat ?? [];

  return (
    <form action={action} className="space-y-4">
      {toi && may ? (
        <div className="grid grid-cols-2 gap-3">
          <Bang nhan="Bạn" so={toi} thang={toi > may} />
          <Bang nhan="Máy" so={may} thang={may > toi} />
        </div>
      ) : (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${ANH}/phitieu/bia.png`} alt="" className="h-24 w-auto" />
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Cược (điểm)</span>
          <input name="cuoc" type="number" min={PHITIEU_MIN} max={PHITIEU_MAX} value={cuoc} onChange={(e) => setCuoc(e.target.value)}
            disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dangChay || het} className="btn-primary disabled:opacity-60">
          {dangChay ? 'Đang ném…' : 'Ném phi tiêu!'}
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

function Bang({ nhan, so, thang }: { nhan: string; so: number; thang: boolean }) {
  return (
    <div className={cn(
      'flex flex-col items-center gap-1 rounded-xl border-2 p-2',
      thang ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'border-ink-200 dark:border-ink-700',
    )}>
      <span className="retro-sub text-ink-400">{nhan}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ANH}/phitieu/${so}.gif`} alt="" className="h-28 w-auto max-w-full object-contain" />
      <b className="text-sm">{so} điểm</b>
    </div>
  );
}
