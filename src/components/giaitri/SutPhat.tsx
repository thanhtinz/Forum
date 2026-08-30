'use client';

import { useActionState, useState } from 'react';
import { choiSutPhat, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, SUT_MAX, SUT_MIN } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';

/**
 * Sút phạt: bốn góc trên chính tấm ảnh khung thành của bản cũ.
 *
 * Bản cũ bày bốn ô radio trong một cái bảng HTML đặt ảnh khung thành làm nền.
 * Ở đây vẫn là bốn góc ấy, nhưng đặt tuyệt đối lên ảnh để bấm vào đúng chỗ
 * mình muốn sút chứ không phải bấm vào một ô vuông trống cạnh khung.
 */
const VITRI = [
  { id: 1, style: { left: '6%', top: '10%' } },
  { id: 2, style: { right: '6%', top: '10%' } },
  { id: 3, style: { left: '6%', top: '45%' } },
  { id: 4, style: { right: '6%', top: '45%' } },
];

export function SutPhat({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiSutPhat, {});
  const [chon, setChon] = useState(1);
  // Giữ mức cược qua các ván: `defaultValue` bật về mức tối thiểu sau mỗi
  // lượt, bắt người chơi gõ lại con số y hệt ván nào cũng như ván nào.
  const [cuoc, setCuoc] = useState(String(SUT_MIN));
  const het = conLai <= 0;
  const [thu, vao] = state.mat ?? [];

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={het}>
        <legend className="label mb-2">Chọn góc sút</legend>
        <div className="relative mx-auto w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* Ảnh gốc chỉ 108×100 nên phải giữ `pixelated`: để trình duyệt nội
              suy là nhoè thành một mảng xanh lục không ra hình gì. */}
          <img src={`${ANH}/sutphat/khung.gif`} alt="Khung thành"
            className="w-full rounded-xl border-2 border-ink-200 dark:border-ink-700"
            style={{ imageRendering: 'pixelated' }} />
          {VITRI.map((v) => {
            const batO = thu === v.id;
            return (
              <label key={v.id} className="absolute cursor-pointer" style={v.style}>
                <input type="radio" name="goc" value={v.id} checked={chon === v.id}
                  onChange={() => setChon(v.id)} className="peer sr-only" />
                <span className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-[3px] text-lg font-black shadow transition-colors sm:h-11 sm:w-11',
                  chon === v.id
                    ? 'border-white bg-brand-500 text-white'
                    : 'border-white/80 bg-black/35 text-white/80 hover:bg-black/55',
                  batO && 'border-rose-300 bg-rose-600 text-white',
                )}>
                  {batO ? '✋' : '●'}
                </span>
              </label>
            );
          })}
          {vao === 1 && (
            // eslint-disable-next-line @next/next/no-img-element
            // `pointer-events-none`: quả bóng đậu ngay trên nút góc vừa sút,
            // không tắt bắt chuột thì ván sau bấm lại đúng góc ấy không được.
            <img src={`${ANH}/sutphat/bong.png`} alt="" aria-hidden
              className="pointer-events-none absolute h-8 w-8"
              style={{ ...VITRI.find((v) => v.id === chon)!.style }} />
          )}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Cược (điểm)</span>
          <input name="cuoc" type="number" min={SUT_MIN} max={SUT_MAX} value={cuoc} onChange={(e) => setCuoc(e.target.value)}
            disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dangChay || het} className="btn-primary disabled:opacity-60">
          {dangChay ? 'Đang chạy đà…' : 'Sút!'}
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
