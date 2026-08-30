'use client';

import { useActionState, useState } from 'react';
import { taoNhanVat, type PokeState } from '@/app/(site)/pokemon/actions';
import { TEN_TOI_DA, TEN_TOI_THIEU, THU_DAU, tenHe } from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';
import { AnhThu, HuyHieuHe } from './ThePoke';

export function TaoNhanVat() {
  const [state, action, dangChay] = useActionState<PokeState, FormData>(taoNhanVat, {});
  const [chon, setChon] = useState<number>(THU_DAU[0].nguon);

  return (
    <form action={action} className="space-y-5">
      <label className="block">
        <span className="label">Tên nhân vật</span>
        <input name="ten" className="input" minLength={TEN_TOI_THIEU} maxLength={TEN_TOI_DA}
          placeholder="Satoshi" autoComplete="off" required />
        <span className="mt-1 block text-xs text-ink-400">
          {TEN_TOI_THIEU}–{TEN_TOI_DA} ký tự, chữ không dấu, số, gạch ngang hoặc gạch dưới.
        </span>
      </label>

      <fieldset>
        <legend className="label mb-2">Chọn thú đi cùng</legend>
        <div className="grid grid-cols-3 gap-2">
          {THU_DAU.map((t) => (
            <label key={t.nguon} className="cursor-pointer">
              <input type="radio" name="thu" value={t.nguon} checked={chon === t.nguon}
                onChange={() => setChon(t.nguon)} className="peer sr-only" />
              <span className={cn(
                'flex h-full flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-colors',
                chon === t.nguon
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                  : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
              )}>
                <AnhThu nguon={t.nguon} className="h-14 w-auto" />
                <b className="text-sm">{t.ten}</b>
                <HuyHieuHe he={t.he} />
                <span className="text-[11px] text-ink-400">
                  {t.nacToiDa > 1 ? `Tiến hoá ${t.nacToiDa} nấc` : 'Không tiến hoá'}
                </span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-400">
          Ba lựa chọn này lấy đúng ba con của bản gốc: {THU_DAU.map((t) => `${t.ten} (${tenHe(t.he)})`).join(', ')}.
        </p>
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={dangChay} className="btn-primary w-full">
        {dangChay ? 'Đang lên thuyền…' : 'Bắt đầu'}
      </button>
    </form>
  );
}
