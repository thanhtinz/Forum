'use client';

import { useActionState, useState } from 'react';
import { choiSocDia, type GameState } from '@/app/(site)/giai-tri/actions';
import { SOCDIA_MAX, SOCDIA_MIN } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';
import { DiaSocDia } from './DiaSocDia';
import { dangDien, useMan } from './dung-man';

const CUA = [
  { id: 1, ten: 'Chẵn', phu: '0 hoặc 2 hoặc 4 mặt ngửa' },
  { id: 2, ten: 'Lẻ', phu: '1 hoặc 3 mặt ngửa' },
];

/** Sóc đĩa: đặt chẵn hay lẻ, xóc bốn đồng rồi mở bát. */
export function SocDia({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiSocDia, {});
  const [cuoc, setCuoc] = useState(String(SOCDIA_MIN));
  const [chon, setChon] = useState(1);
  const het = conLai <= 0;

  const man = useMan(dangChay, state);
  const dien = dangDien(man);
  const xong = man === 'ketqua';

  const ra = xong ? state.mat?.[0] : undefined;
  // Đồng lộ từ màn kết thúc (lúc nhấc bát), còn cửa thắng và dòng kể thì đợi
  // tới màn kết quả — nhấc bát ra mà chữ hiện luôn thì mất hết phần hồi hộp.
  const dong = man === 'ketthuc' || xong ? (state.mat?.slice(1) ?? []) : [];
  const ngua = dong.filter((d) => d === 1).length;

  return (
    <form action={action} className="space-y-4">
      {/* Úp bát trong lúc xóc, nhấc lên ở màn kết thúc. Ở màn kết thúc phải
          hiện ĐỒNG THỜI cả bốn đồng lẫn cái bát đang bay lên, không thì bát
          biến mất đột ngột rồi đồng mới hiện ra. */}
      <DiaSocDia
        dong={dong}
        xoc={man === 'batdau' || man === 'dienra'}
        kin={man === 'cho' || man === 'batdau' || man === 'dienra'}
        batDangMo={man === 'ketthuc'} />

      {xong && (
        <p className="man-hien text-center text-sm text-ink-500">
          <b className="text-ink-800 dark:text-ink-100">{ngua} mặt ngửa</b>
          {' → '}{ra === 1 ? 'Chẵn' : 'Lẻ'}
        </p>
      )}

      <fieldset disabled={het || dien}>
        <legend className="label mb-2">Đặt cửa</legend>
        <div className="grid max-w-sm grid-cols-2 gap-2">
          {CUA.map((c) => {
            const truot = xong && ra !== undefined && ra !== c.id;
            return (
              <label key={c.id} className={cn('cursor-pointer', dien && 'cursor-wait')}>
                <input type="radio" name="cua" value={c.id} checked={chon === c.id}
                  onChange={() => setChon(c.id)} className="peer sr-only" />
                <span className={cn(
                  'flex flex-col items-center gap-0.5 rounded-xl border-2 p-3 text-center transition-colors',
                  chon === c.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                    : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
                  // Cửa vừa mở thắng thế nào cũng phải nhìn ra ngay, kể cả khi
                  // nó không phải cửa mình đặt.
                  xong && ra === c.id && 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
                  truot && 'opacity-55',
                )}>
                  <b className="text-lg">{c.ten}</b>
                  <span className="text-[11px] leading-tight text-ink-400">{c.phu}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Cược (điểm)</span>
          <input name="cuoc" type="number" min={SOCDIA_MIN} max={SOCDIA_MAX} value={cuoc}
            onChange={(e) => setCuoc(e.target.value)} disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dien || het} className="btn-primary disabled:opacity-60">
          {dien ? 'Đang xóc…' : 'Mở bát!'}
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
