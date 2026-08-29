'use client';

import { useActionState, useState } from 'react';
import { choiBauCua, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, BAUCUA_CONS, BAUCUA_MAX, BAUCUA_MIN } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';

/**
 * Mâm bầu cua, dùng đúng sáu con GIF của bản cũ.
 *
 * Ba viên xúc xắc hiện lại bằng chính bộ ảnh ấy — bản wap ngày trước cũng làm
 * thế, và nhìn ra ngay mình trúng mấy con.
 */
export function BauCua({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiBauCua, {});
  const [chon, setChon] = useState(1);
  const het = conLai <= 0;

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={het}>
        <legend className="label mb-2">Đặt cửa</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {BAUCUA_CONS.map((c) => (
            <label key={c.id} className="cursor-pointer">
              <input type="radio" name="con" value={c.id} checked={chon === c.id}
                onChange={() => setChon(c.id)} className="peer sr-only" />
              <span className={cn(
                'flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-colors',
                chon === c.id
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                  : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
              )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${ANH}/baucua/${c.id}.gif`} alt="" width={40} height={40}
                  className="size-10 object-contain" />
                <span className="text-xs font-semibold">{c.ten}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Cược (điểm)</span>
          <input name="cuoc" type="number" min={BAUCUA_MIN} max={BAUCUA_MAX} defaultValue={BAUCUA_MIN}
            disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dangChay || het} className="btn-primary disabled:opacity-60">
          {dangChay ? 'Đang xóc…' : 'Xóc bát'}
        </button>
        <span className="retro-sub text-ink-400">Còn {conLai} ván hôm nay</span>
      </div>

      {state.mat && (
        <div className="flex items-center gap-2 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
          {state.mat.map((m, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={`${ANH}/baucua/${m}.gif`} alt="" width={44} height={44}
              className="size-11 rounded-lg bg-white object-contain p-0.5 shadow-sm dark:bg-ink-900" />
          ))}
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
