'use client';

import { useActionState, useState } from 'react';
import { choiQuayXeng, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, XENG_BIEU_TUONG, XENG_DUONG, XENG_MAX, XENG_MIN } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';

/** Lưới bày sẵn lúc chưa quay: đúng ba hàng mẫu của bản cũ. */
const MAU = [1, 2, 3, 7, 7, 7, 4, 5, 6];

/**
 * Máy quay xèng ba hàng ba cột.
 *
 * `mat` từ máy chủ về là 9 ô, một số −1 ngăn cách, rồi tới chỉ số các đường
 * trúng. Gói chung một mảng vì `GameState` vốn chỉ có đúng một chỗ chở số.
 */
export function QuayXeng({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiQuayXeng, {});
  // Giữ mức cược qua các ván: `defaultValue` bật về mức tối thiểu sau mỗi
  // lượt, bắt người chơi gõ lại con số y hệt ván nào cũng như ván nào.
  const [cuoc, setCuoc] = useState(String(XENG_MIN));
  const het = conLai <= 0;

  const cat = state.mat?.indexOf(-1) ?? -1;
  const o = cat > 0 ? state.mat!.slice(0, cat) : MAU;
  const duong = cat > 0 ? state.mat!.slice(cat + 1) : [];
  const daQuay = cat > 0;

  // Ô nào nằm trên một đường trúng thì sáng lên — không có nó thì người chơi
  // phải tự dò chín ô xem mình ăn ở đâu.
  const sang = new Set<number>();
  for (const i of duong) for (const v of XENG_DUONG[i] ?? []) sang.add(v);

  return (
    <form action={action} className="space-y-4">
      <div className="mx-auto w-fit rounded-2xl border-4 border-amber-700/70 bg-gradient-to-b from-amber-100 to-amber-200 p-3 shadow-inner dark:from-amber-950/60 dark:to-amber-900/40">
        <div className="grid grid-cols-3 gap-1.5">
          {o.map((con, i) => (
            <span key={i}
              className={cn(
                'flex h-14 w-14 items-center justify-center rounded-lg border-2 transition-colors sm:h-16 sm:w-16',
                sang.has(i)
                  ? 'border-amber-500 bg-amber-300/70 dark:bg-amber-500/30'
                  : 'border-amber-800/25 bg-white/80 dark:bg-ink-900/70',
              )}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ANH}/quayxeng/${con}.gif`} alt=""
                className="h-8 w-auto object-contain"
                style={{ imageRendering: 'pixelated' }} />
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Cược (điểm)</span>
          <input name="cuoc" type="number" min={XENG_MIN} max={XENG_MAX} value={cuoc} onChange={(e) => setCuoc(e.target.value)}
            disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dangChay || het} className="btn-primary disabled:opacity-60">
          {dangChay ? 'Đang quay…' : 'Quay!'}
        </button>
      </div>

      {daQuay && state.ke && (
        <p className={cn('text-sm font-medium',
          (state.delta ?? 0) > 0 ? 'text-emerald-600' : 'text-ink-600 dark:text-ink-300')}>
          {state.ke}
        </p>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <p className="label mb-2">Bảng trả thưởng — ba ô cùng hàng, cùng cột hoặc chéo</p>
        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {XENG_BIEU_TUONG.map((t) => (
            <li key={t.id} className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-2 py-1.5 dark:bg-ink-800/50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${ANH}/quayxeng/${t.id}.gif`} alt="" className="h-5 w-auto"
                style={{ imageRendering: 'pixelated' }} />
              <span className="text-xs text-ink-500">{t.ten}</span>
              <b className="ml-auto text-xs">{t.boi}×</b>
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
