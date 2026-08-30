'use client';

import { useActionState } from 'react';
import { choRaTran, dungDa, thaThu, type PokeState } from '@/app/(site)/pokemon/actions';
import { CAP_TIEN_HOA, EXP_MOI_CAP, boThu } from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';
import { HuyHieuHe, ThanhMau, TrenBe } from './ThePoke';

interface T {
  id: string; ten: string; nguon: number; nac: number; nacToiDa: number;
  he: number; cap: number; exp: number; mau: number; mauToiDa: number;
  c: number[]; chieu: string[];
}

export function KhoThu({ thu, raTranId, coDa }: { thu: T[]; raTranId: string | null; coDa: number }) {
  const [ra, raAction] = useActionState<PokeState, FormData>(choRaTran, {});
  const [da, daAction] = useActionState<PokeState, FormData>(dungDa, {});
  const [tha, thaAction] = useActionState<PokeState, FormData>(thaThu, {});
  const loi = ra.error ?? da.error ?? tha.error;
  const ke = !loi ? (ra.ke ?? da.ke ?? tha.ke) : null;

  if (thu.length === 0) return <p className="text-sm text-ink-500">Kho chưa có con nào.</p>;

  return (
    <div className="space-y-3">
      {loi && <p className="text-sm text-red-600">{loi}</p>}
      {ke && <p className="man-hien text-sm font-medium text-emerald-600">{ke}</p>}

      {thu.map((t) => {
        const dangRa = t.id === raTranId;
        // Nấc kế tiếp mở ở cấp nào — nói thẳng ra chứ không bắt đoán.
        const nacSau = t.nac < t.nacToiDa && t.nac < 3 ? t.nac + 1 : null;
        return (
          <div key={t.id} className={cn(
            'rounded-xl border-2 p-3 transition-colors',
            dangRa ? 'dao-vien dao-nen-nhan' : 'border-ink-200 dark:border-ink-700',
          )}>
            <div className="flex items-start gap-3">
              <TrenBe nguon={t.nguon} nac={t.nac} className="h-16 w-16 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">{t.ten}</b>
                  <HuyHieuHe he={t.he} />
                  <span className="text-xs text-ink-400">
                    Cấp {t.cap} · nấc {t.nac}/{t.nacToiDa}
                  </span>
                  {dangRa && <span className="dao-nhan text-[11px] font-bold">đang ra trận</span>}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <ThanhMau mau={t.mau} toiDa={t.mauToiDa} nho />
                  <span className="shrink-0 text-xs tabular-nums text-ink-500">{t.mau}/{t.mauToiDa}</span>
                </div>
                <p className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-ink-400">
                  <span>công <b className="tabular-nums text-ink-600 dark:text-ink-300">{Math.max(...t.c).toLocaleString('vi')}</b></span>
                  <span>thủ <b className="tabular-nums text-ink-600 dark:text-ink-300">
                    {boThu({ c1: t.c[0]!, c2: t.c[1]!, c3: t.c[2]!, c4: t.c[3]! }).toLocaleString('vi')}
                  </b></span>
                  <span>KN <b className="tabular-nums text-ink-600 dark:text-ink-300">{t.exp}/{EXP_MOI_CAP}</b></span>
                </p>
                {nacSau && (
                  <p className="mt-0.5 text-xs text-violet-600 dark:text-violet-300">
                    Tiến hoá nấc {nacSau} ở cấp {CAP_TIEN_HOA[nacSau - 1]}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-2">
              {!dangRa && (
                <form action={raAction}>
                  <input type="hidden" name="thu" value={t.id} />
                  <button className="btn-outline !py-1 text-xs">Cho ra trận</button>
                </form>
              )}
              <form action={daAction}>
                <input type="hidden" name="thu" value={t.id} />
                <button disabled={coDa < 1 || t.exp < EXP_MOI_CAP}
                  className="btn-outline !py-1 text-xs disabled:opacity-50"
                  title={coDa < 1 ? 'Bạn không có đá' : t.exp < EXP_MOI_CAP ? `Cần ${EXP_MOI_CAP} KN` : undefined}>
                  Dùng đá tiến cấp
                </button>
              </form>
              {!dangRa && thu.length > 1 && (
                <form action={thaAction}>
                  <input type="hidden" name="thu" value={t.id} />
                  <button className="btn !py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                    Thả
                  </button>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
