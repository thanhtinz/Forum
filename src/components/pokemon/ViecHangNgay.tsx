'use client';

import { useActionState } from 'react';
import { Check } from 'lucide-react';
import { nhanThuongNgay, type PokeState } from '@/app/(site)/pokemon/actions';
import { cn } from '@/lib/utils';

export interface ViecNgay {
  ma: string; ten: string; mo: string; can: number;
  vang: number; ngoc: number; cau: number;
  lam: number; xong: boolean; daNhan: boolean;
}

/**
 * Ba việc làm lại mỗi ngày.
 *
 * Chuỗi nhiệm vụ nhập môn chỉ có bốn bước, nhận hết là mục Nhiệm vụ vĩnh viễn
 * trống. Ba việc này cho nó một lý do để quay lại.
 */
export function ViecHangNgay({ viec }: { viec: ViecNgay[] }) {
  const [state, action, dangChay] = useActionState<PokeState, FormData>(nhanThuongNgay, {});

  return (
    <div className="space-y-3">
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ke && !state.error && (
        <p className="man-hien text-sm font-medium text-emerald-600">{state.ke}</p>
      )}

      {viec.map((v) => (
        <div key={v.ma} className={cn(
          'rounded-xl border-2 p-3',
          v.daNhan ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'
            : v.xong ? 'border-brand-400' : 'border-ink-200 dark:border-ink-700',
        )}>
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-sm">{v.ten}</b>
            {v.daNhan && <span className="text-[11px] font-bold text-emerald-600">đã nhận</span>}
            <span className="ml-auto text-xs text-ink-400">{v.lam}/{v.can}</span>
          </div>
          <p className="mt-0.5 text-sm text-ink-500">{v.mo}</p>

          {/* Thanh tiến độ: đọc số "3/10" thì chậm hơn nhìn một vạch. */}
          <div className="dao-mau mt-1.5 h-1.5 w-full">
            <i className={v.xong ? 'bg-emerald-500' : 'bg-brand-500'}
              style={{ width: `${Math.min(100, (v.lam / v.can) * 100)}%` }} />
          </div>

          <p className="mt-1 text-xs text-ink-400">
            Thưởng: {v.vang.toLocaleString('vi')} vàng, {v.ngoc} ngọc, {v.cau} quả cầu
          </p>

          {!v.daNhan && (
            <form action={action} className="mt-2">
              <input type="hidden" name="ma" value={v.ma} />
              <button disabled={dangChay || !v.xong}
                className="btn-primary gap-1.5 !py-1.5 text-sm disabled:opacity-50">
                {v.xong ? <><Check size={14} /> Nhận thưởng</> : 'Chưa xong'}
              </button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
