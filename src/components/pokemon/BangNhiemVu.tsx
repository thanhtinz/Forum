'use client';

import { useActionState } from 'react';
import { Check, Lock } from 'lucide-react';
import { nhanThuongNhiemVu, type PokeState } from '@/app/(site)/pokemon/actions';
import { NHIEM_VU } from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';

export function BangNhiemVu({ daNhan, tienDo }: { daNhan: number; tienDo: boolean[] }) {
  const [state, action, dangChay] = useActionState<PokeState, FormData>(nhanThuongNhiemVu, {});

  return (
    <div className="space-y-3">
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ke && !state.error && <p className="man-hien text-sm font-medium text-emerald-600">{state.ke}</p>}

      {NHIEM_VU.map((n, i) => {
        const nhanRoi = i < daNhan;
        const denLuot = i === daNhan;
        const xong = tienDo[i] === true;
        return (
          <div key={n.ten} className={cn(
            'rounded-xl border-2 p-3',
            nhanRoi ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'
              : denLuot ? 'border-brand-400' : 'border-ink-200 opacity-70 dark:border-ink-700',
          )}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip !py-0 text-[11px]">{i + 1}</span>
              <b className="text-sm">{n.ten}</b>
              {nhanRoi && <span className="text-[11px] font-bold text-emerald-600">đã nhận</span>}
            </div>
            <p className="mt-0.5 text-sm text-ink-500">{n.mo}</p>
            <p className="mt-0.5 text-xs text-ink-400">
              Thưởng: {n.exp} kinh nghiệm
              {n.vang ? `, ${n.vang} vàng` : ''}{n.ngoc ? `, ${n.ngoc} ngọc` : ''}
            </p>

            {!nhanRoi && (
              <div className="mt-2">
                {denLuot ? (
                  <form action={action}>
                    <button disabled={dangChay || !xong}
                      className="btn-primary gap-1.5 !py-1.5 text-sm disabled:opacity-50">
                      {xong ? <><Check size={14} /> Nhận thưởng</> : 'Chưa xong'}
                    </button>
                  </form>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-ink-400">
                    <Lock size={12} /> Nhận nhiệm vụ trước đã
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
