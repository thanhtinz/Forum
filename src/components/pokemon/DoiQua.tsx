'use client';

import { useActionState } from 'react';
import { Gift } from 'lucide-react';
import { doiQuaChien, type PokeState } from '@/app/(site)/pokemon/actions';
import { DIEM_DOI_QUA } from '@/lib/pokemon-const';

export function DoiQua({ diem, qua }: { diem: number; qua: readonly string[] }) {
  const [state, action, dangChay] = useActionState<PokeState, FormData>(doiQuaChien, {});
  const du = diem >= DIEM_DOI_QUA;

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
      <p className="label mb-1">Đổi quà</p>
      <p className="mb-2 text-xs text-ink-500">
        {DIEM_DOI_QUA} điểm một lần, bốc ngẫu nhiên một trong {qua.length} phần:{' '}
        {qua.join(', ').toLowerCase()}.
      </p>
      {state.error && <p className="mb-2 text-sm text-red-600">{state.error}</p>}
      {state.ke && !state.error && (
        <p className="man-hien mb-2 text-sm font-medium text-emerald-600">{state.ke}</p>
      )}
      <form action={action}>
        <button disabled={dangChay || !du} className="btn-primary gap-1.5 !py-1.5 text-sm disabled:opacity-50">
          <Gift size={14} /> Đổi quà ({diem}/{DIEM_DOI_QUA})
        </button>
      </form>
    </div>
  );
}
