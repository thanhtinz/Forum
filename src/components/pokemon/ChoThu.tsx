'use client';

import { useActionState } from 'react';
import { huyRao, muaThu, raoBan, type PokeState } from '@/app/(site)/pokemon/actions';
import { CHO_GIA_MAX, CHO_GIA_MIN, boThu } from '@/lib/pokemon-const';
import { AnhThu, HuyHieuHe } from './ThePoke';

interface Rao {
  id: string; gia: number; cuaToi: boolean; nguoi: string;
  ten: string; nguon: number; nac: number; he: number;
  cap: number; capCuong: number; mauToiDa: number; c: number[];
}
interface Thu {
  id: string; ten: string; nguon: number; nac: number; he: number;
  cap: number; capCuong: number; mauToiDa: number;
}

export function ChoThu({ rao, coTheRao, ngoc }: {
  toiId: string; ngoc: number; rao: Rao[]; coTheRao: Thu[];
}) {
  const [ban, banAction, dangBan] = useActionState<PokeState, FormData>(raoBan, {});
  const [huy, huyAction, dangHuy] = useActionState<PokeState, FormData>(huyRao, {});
  const [mua, muaAction, dangMua] = useActionState<PokeState, FormData>(muaThu, {});
  const loi = ban.error ?? huy.error ?? mua.error;

  return (
    <div className="space-y-4">
      {loi && <p className="text-sm text-red-600">{loi}</p>}
      {(ban.ke ?? huy.ke ?? mua.ke) && !loi && (
        <p className="man-hien text-sm font-medium text-emerald-600">{ban.ke ?? huy.ke ?? mua.ke}</p>
      )}

      <div>
        <p className="label mb-2">Đang bán ({rao.length})</p>
        {rao.length === 0 ? (
          <p className="text-sm text-ink-500">Chưa ai rao con nào.</p>
        ) : (
          <div className="space-y-2">
            {rao.map((k) => (
              <div key={k.id} className="flex items-center gap-3 rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
                <AnhThu nguon={k.nguon} nac={k.nac} className="h-12 w-12 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-sm">{k.ten}</b>
                    <HuyHieuHe he={k.he} />
                    <span className="chip !py-0 text-[11px]">{k.gia} ngọc</span>
                  </div>
                  <p className="text-xs text-ink-400">
                    Cấp {k.cap} · cường hoá {k.capCuong} · máu {k.mauToiDa} ·
                    {' '}thủ {boThu({ c1: k.c[0]!, c2: k.c[1]!, c3: k.c[2]!, c4: k.c[3]! })}
                  </p>
                  <p className="text-xs text-ink-400">Người bán: {k.nguoi}</p>
                </div>
                {k.cuaToi ? (
                  <form action={huyAction}>
                    <input type="hidden" name="rao" value={k.id} />
                    <button disabled={dangHuy} className="btn shrink-0 !py-1.5 text-sm">Rút về</button>
                  </form>
                ) : (
                  <form action={muaAction}>
                    <input type="hidden" name="rao" value={k.id} />
                    <button disabled={dangMua || ngoc < k.gia}
                      className="btn-primary shrink-0 !py-1.5 text-sm disabled:opacity-50"
                      title={ngoc < k.gia ? 'Bạn không đủ ngọc' : undefined}>Mua</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="label mb-2">Rao con của bạn</p>
        {coTheRao.length === 0 ? (
          <p className="text-sm text-ink-500">
            Không có con nào rao được — con đang ra trận và con cuối cùng thì phải giữ lại.
          </p>
        ) : (
          <div className="space-y-2">
            {coTheRao.map((t) => (
              <form key={t.id} action={banAction}
                className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
                <input type="hidden" name="thu" value={t.id} />
                <AnhThu nguon={t.nguon} nac={t.nac} className="h-11 w-11 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-sm">{t.ten}</b>
                    <HuyHieuHe he={t.he} />
                  </div>
                  <p className="text-xs text-ink-400">
                    Cấp {t.cap} · cường hoá {t.capCuong} · máu {t.mauToiDa}
                  </p>
                </div>
                <label className="block">
                  <span className="label">Giá (ngọc)</span>
                  <input name="gia" type="number" min={CHO_GIA_MIN} max={CHO_GIA_MAX}
                    defaultValue={10} className="input !w-24" />
                </label>
                <button disabled={dangBan} className="btn-outline shrink-0 !py-1.5 text-sm">Rao bán</button>
              </form>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
