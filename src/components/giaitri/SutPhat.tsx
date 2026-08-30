'use client';

import { useActionState, useState } from 'react';
import { choiSutPhat, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, SUT_MAX, SUT_MIN } from '@/lib/mini-game-const';
import { cn } from '@/lib/utils';
import { dangDien, useMan } from './dung-man';

/**
 * Sút phạt: bốn góc trên chính tấm ảnh khung thành của bản cũ.
 *
 * Bản gốc bày bốn ô radio trong một cái bảng HTML đặt ảnh khung thành làm nền.
 * Ở đây vẫn là bốn góc ấy, nhưng đặt tuyệt đối lên ảnh để bấm vào đúng chỗ
 * mình muốn sút chứ không phải bấm vào một ô vuông trống cạnh khung.
 *
 * `dx`/`dy` là quãng bóng phải bay NGƯỢC về chấm phạt, dùng làm điểm xuất phát
 * cho hoạt cảnh — bóng bắt đầu ở dưới đất giữa sân rồi bay lên góc đã chọn.
 */
const VITRI = [
  { id: 1, style: { left: '6%', top: '10%' }, dx: '84px', dy: '150px' },
  { id: 2, style: { right: '6%', top: '10%' }, dx: '-84px', dy: '150px' },
  { id: 3, style: { left: '6%', top: '45%' }, dx: '84px', dy: '90px' },
  { id: 4, style: { right: '6%', top: '45%' }, dx: '-84px', dy: '90px' },
];

export function SutPhat({ conLai }: { conLai: number }) {
  const [state, action, dangChay] = useActionState<GameState, FormData>(choiSutPhat, {});
  const [cuoc, setCuoc] = useState(String(SUT_MIN));
  const [chon, setChon] = useState(1);
  const het = conLai <= 0;

  const man = useMan(dangChay, state);
  const dien = dangDien(man);
  const xong = man === 'ketqua';
  // Thủ môn chỉ lộ hướng ở màn kết thúc — sớm hơn là biết trước kết quả.
  const [thu, vao] = man === 'ketthuc' || xong ? state.mat ?? [] : [];
  const oChon = VITRI.find((v) => v.id === chon)!;

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={het || dien}>
        <legend className="label mb-2">Chọn góc sút</legend>
        <div className="relative mx-auto w-full max-w-xs">
          {/* Ảnh gốc chỉ 108×100 nên phải giữ `pixelated`: để trình duyệt nội
              suy là nhoè thành một mảng xanh lục không ra hình gì. */}
          <img src={`${ANH}/sutphat/khung.gif`} alt="Khung thành"
            className="w-full rounded-xl border-2 border-ink-200 dark:border-ink-700"
            style={{ imageRendering: 'pixelated' }} />
          {VITRI.map((v) => {
            const batO = thu === v.id;
            return (
              <label key={v.id} className={cn('absolute cursor-pointer', dien && 'cursor-wait')}
                style={v.style}>
                <input type="radio" name="goc" value={v.id} checked={chon === v.id}
                  onChange={() => setChon(v.id)} className="peer sr-only" />
                <span className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full border-[3px] text-lg font-black shadow transition-colors sm:h-11 sm:w-11',
                  chon === v.id
                    ? 'border-white bg-brand-500 text-white'
                    : 'border-white/80 bg-black/35 text-white/80 hover:bg-black/55',
                  batO && 'thu-bay border-rose-300 bg-rose-600 text-white',
                )}>
                  {batO ? '✋' : '●'}
                </span>
              </label>
            );
          })}

          {/* Quả bóng bay lên góc đã chọn ở màn kết thúc, rồi nằm lại nếu vào. */}
          {(man === 'ketthuc' || (xong && vao === 1)) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${ANH}/sutphat/bong.png`} alt="" aria-hidden
              className={cn('pointer-events-none absolute h-8 w-8',
                man === 'ketthuc' && 'sut-bay')}
              style={{
                ...oChon.style,
                ['--sut-dx' as string]: oChon.dx,
                ['--sut-dy' as string]: oChon.dy,
              }} />
          )}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Cược (điểm)</span>
          <input name="cuoc" type="number" min={SUT_MIN} max={SUT_MAX} value={cuoc}
            onChange={(e) => setCuoc(e.target.value)} disabled={het} className="input !w-32" />
        </label>
        <button type="submit" disabled={dien || het} className="btn-primary disabled:opacity-60">
          {dien ? 'Đang chạy đà…' : 'Sút!'}
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
