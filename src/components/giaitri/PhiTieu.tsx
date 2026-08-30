'use client';

import { useActionState, useState } from 'react';
import { choiPhiTieu, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, PHITIEU_MAX, PHITIEU_MIN } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';
import { dangDien, useMan } from './dung-man';

/** Phi tiêu: không chọn gì cả, cứ ném rồi so điểm với máy — y bản cũ. */
export function PhiTieu({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiPhiTieu, {});
  const [cuoc, setCuoc] = useState(String(PHITIEU_MIN));
  const het = conLai <= 0;

  const man = useMan(dangChay, state);
  const dien = dangDien(man);
  const xong = man === 'ketqua';
  const [toi, may] = state.mat ?? [];

  return (
    <form action={action} className="space-y-4">
      {dien || xong ? (
        <div className="grid grid-cols-2 gap-3">
          {/* Bảng quay trong lúc ngắm, dừng lại khi mũi tiêu cắm xuống. */}
          <Bang nhan="Bạn" so={toi} hien={xong} quay={man === 'batdau' || man === 'dienra'}
            thang={xong && toi! > may!} />
          <Bang nhan="Máy" so={may} hien={xong} quay={man === 'batdau' || man === 'dienra'}
            thang={xong && may! > toi!} />
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
          <input name="cuoc" type="number" min={PHITIEU_MIN} max={PHITIEU_MAX} value={cuoc}
            onChange={(e) => setCuoc(e.target.value)} disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dien || het} className="btn-primary disabled:opacity-60">
          {dien ? 'Đang ngắm…' : 'Ném phi tiêu!'}
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

function Bang({ nhan, so, hien, quay, thang }: {
  nhan: string; so?: number; hien: boolean; quay: boolean; thang: boolean;
}) {
  return (
    <div className={cn(
      'flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-colors',
      thang ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'border-ink-200 dark:border-ink-700',
    )}>
      <span className="retro-sub text-ink-400">{nhan}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${ANH}/phitieu/${so ?? 1}.gif`} alt=""
        className={cn('h-28 w-auto max-w-full object-contain',
          quay && 'tieu-quay', !quay && hien && 'tieu-cam')} />
      <b className={cn('text-sm', !hien && 'text-ink-300 dark:text-ink-600')}>
        {hien ? `${so} điểm` : '…'}
      </b>
    </div>
  );
}
