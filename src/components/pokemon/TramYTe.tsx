'use client';

import { useActionState, useEffect, useState } from 'react';
import { chuaTri, type PokeState } from '@/app/(site)/pokemon/actions';
import { YTE_MAU, YTE_MAU_CHO_MS, YTE_SK, YTE_SK_CHO_MS } from '@/lib/pokemon-const';
import { AnhThu, HuyHieuHe, ThanhMau } from './ThePoke';

interface Con { ten: string; nguon: number; nac: number; he: number; mau: number; mauToiDa: number }

export function TramYTe({ chuaLuc, sk, skToiDa, thu }: {
  chuaLuc: number; sk: number; skToiDa: number; thu: Con | null | undefined;
}) {
  const [state, action, dangChay] = useActionState<PokeState, FormData>(chuaTri, {});
  // Đồng hồ chạy ở trình duyệt để nút tự bật lại khi hết giờ chờ; máy chủ vẫn
  // kiểm lại mốc thời gian, ở đây chỉ là cho đỡ phải bấm mò.
  const [bayGio, setBayGio] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setBayGio(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const conMau = Math.max(0, chuaLuc + YTE_MAU_CHO_MS - bayGio);
  const conSk = Math.max(0, chuaLuc + YTE_SK_CHO_MS - bayGio);

  return (
    <div className="space-y-4">
      {thu && (
        <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
          <AnhThu nguon={thu.nguon} nac={thu.nac} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <b className="text-sm">{thu.ten}</b>
              <HuyHieuHe he={thu.he} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <ThanhMau mau={thu.mau} toiDa={thu.mauToiDa} nho />
              <span className="shrink-0 text-xs tabular-nums text-ink-500">{thu.mau}/{thu.mauToiDa}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <span className="shrink-0 text-ink-400">Thể lực</span>
        <ThanhMau mau={sk} toiDa={skToiDa} nho />
        <b className="shrink-0 tabular-nums">{sk}/{skToiDa}</b>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ke && !state.error && <p className="man-hien text-sm font-medium text-emerald-600">{state.ke}</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        <form action={action}>
          <input type="hidden" name="kieu" value="mau" />
          <button disabled={dangChay || conMau > 0 || !thu || thu.mau >= thu.mauToiDa}
            className="btn-primary w-full justify-center !py-2 text-sm disabled:opacity-60">
            {conMau > 0 ? `Hồi máu (${dem(conMau)})` : `Hồi ${YTE_MAU} máu`}
          </button>
        </form>
        <form action={action}>
          <input type="hidden" name="kieu" value="sk" />
          <button disabled={dangChay || conSk > 0 || sk >= skToiDa}
            className="btn-outline w-full justify-center !py-2 text-sm disabled:opacity-60">
            {conSk > 0 ? `Hồi thể lực (${dem(conSk)})` : `Hồi ${YTE_SK} thể lực`}
          </button>
        </form>
      </div>
    </div>
  );
}

function dem(ms: number): string {
  const g = Math.ceil(ms / 1000);
  return `${Math.floor(g / 60)}:${String(g % 60).padStart(2, '0')}`;
}
