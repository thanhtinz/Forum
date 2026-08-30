'use client';

import { useActionState, useState } from 'react';
import { doiNgoc, muaHang, type PokeState } from '@/app/(site)/pokemon/actions';
import { ANH_POKE, EXP_MOI_CAP, GIA_CAU, GIA_DA, MUA_TOI_DA, NGOC_MOI_DA } from '@/lib/pokemon-const';

const MON = [
  {
    ma: 'cau', ten: 'Quả cầu', gia: GIA_CAU, anh: `${ANH_POKE}/icon/quacau.gif`,
    mo: 'Ném vào thú hoang để bắt. Ném là mất, trúng hay không cũng vậy.',
  },
  {
    ma: 'da', ten: 'Đá tiến cấp', gia: GIA_DA, anh: `${ANH_POKE}/icon/da.png`,
    mo: `Cho một con lên một cấp: cộng 100 vào cả bốn chiêu lẫn máu. Con ấy phải có đủ ${EXP_MOI_CAP} kinh nghiệm.`,
  },
] as const;

export function CuaHangPoke({ vang, cau, da, ngoc }: {
  vang: number; cau: number; da: number; ngoc: number;
}) {
  const [state, action, dangChay] = useActionState<PokeState, FormData>(muaHang, {});
  const [ng, ngAction, dangNg] = useActionState<PokeState, FormData>(doiNgoc, {});
  const [sl, setSl] = useState<Record<string, string>>({ cau: '1', da: '1' });

  return (
    <div className="space-y-3">
      {(state.error ?? ng.error) && <p className="text-sm text-red-600">{state.error ?? ng.error}</p>}
      {(state.ke ?? ng.ke) && !(state.error ?? ng.error) && (
        <p className="man-hien text-sm font-medium text-emerald-600">{state.ke ?? ng.ke}</p>
      )}

      {MON.map((m) => {
        const dangCo = m.ma === 'cau' ? cau : da;
        const so = Number(sl[m.ma] ?? '1');
        const tong = Number.isFinite(so) ? m.gia * so : 0;
        return (
          <form key={m.ma} action={action} className="rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
            <input type="hidden" name="mon" value={m.ma} />
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.anh} alt="" aria-hidden className="h-10 w-10 object-contain"
                style={{ imageRendering: 'pixelated' }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">{m.ten}</b>
                  <span className="chip !py-0 text-[11px]">{m.gia} vàng</span>
                  <span className="text-xs text-ink-400">đang có {dangCo}</span>
                </div>
                <p className="mt-0.5 text-xs text-ink-500">{m.mo}</p>
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="label">Số lượng</span>
                <input name="sl" type="number" min={1} max={MUA_TOI_DA} className="input !w-24"
                  value={sl[m.ma] ?? '1'}
                  onChange={(e) => setSl((s) => ({ ...s, [m.ma]: e.target.value }))} />
              </label>
              <button type="submit" disabled={dangChay || tong > vang}
                className="btn-primary !py-1.5 text-sm disabled:opacity-60">
                Mua — {tong} vàng
              </button>
              {tong > vang && <span className="self-center text-xs text-amber-600">Không đủ vàng</span>}
            </div>
          </form>
        );
      })}

      {/* Chỗ tiêu ngọc — ngọc chỉ Gym mới cho, nên đây là phần thưởng thật cho
          việc đi hết mười bốn Gym chứ không phải một con số nằm chơi. */}
      <form action={ngAction} className="rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-sm">Đổi ngọc lấy đá</b>
          <span className="chip !py-0 text-[11px]">{NGOC_MOI_DA} ngọc / viên</span>
          <span className="text-xs text-ink-400">đang có {ngoc} ngọc</span>
        </div>
        <p className="mt-0.5 text-xs text-ink-500">
          Ngọc chỉ có ở Gym. Đổi ra đá tiến cấp thì rẻ hơn hẳn mua bằng vàng.
        </p>
        <div className="mt-2.5 flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="label">Số viên</span>
            <input name="sl" type="number" min={1} max={MUA_TOI_DA} defaultValue={1} className="input !w-24" />
          </label>
          <button type="submit" disabled={dangNg || ngoc < NGOC_MOI_DA}
            className="btn-primary !py-1.5 text-sm disabled:opacity-60">
            Đổi
          </button>
          {ngoc < NGOC_MOI_DA && <span className="self-center text-xs text-amber-600">Chưa đủ ngọc</span>}
        </div>
      </form>
    </div>
  );
}