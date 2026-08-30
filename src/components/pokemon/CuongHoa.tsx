'use client';

import { useActionState } from 'react';
import { cuongHoa, muaHuyenTinh, type PokeState } from '@/app/(site)/pokemon/actions';
import {
  CAP_CUONG_TOI_DA, HUYEN_TINH, MUA_TOI_DA, anhHuyenTinh, timHuyenTinh,
} from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';
import { AnhThu, HuyHieuHe } from './ThePoke';

interface T {
  id: string; ten: string; nguon: number; nac: number; he: number;
  capCuong: number; mau: number; mauToiDa: number;
}

export function CuongHoa({ kho, thu, vang, ngoc }: {
  kho: { cap: number; sl: number }[]; thu: T[]; vang: number; ngoc: number;
}) {
  const [mua, muaAction, dangMua] = useActionState<PokeState, FormData>(muaHuyenTinh, {});
  const [ren, renAction, dangRen] = useActionState<PokeState, FormData>(cuongHoa, {});
  const loi = mua.error ?? ren.error;
  const co = (cap: number) => kho.find((k) => k.cap === cap)?.sl ?? 0;

  return (
    <div className="space-y-4">
      {loi && <p className="text-sm text-red-600">{loi}</p>}
      {(mua.ke ?? ren.ke) && !loi && (
        <p className="man-hien text-sm font-medium text-emerald-600">{mua.ke ?? ren.ke}</p>
      )}

      <div>
        <p className="label mb-2">Sáu loại huyền tinh</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {HUYEN_TINH.map((h) => {
            const duTien = h.vang ? vang >= h.vang : ngoc >= h.ngoc;
            return (
              <form key={h.cap} action={muaAction}
                className="rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
                <input type="hidden" name="cap" value={h.cap} />
                <div className="flex items-start gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={anhHuyenTinh(h.cap)} alt="" aria-hidden className="h-9 w-9 object-contain"
                    style={{ imageRendering: 'pixelated' }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <b className="text-sm">Huyền tinh {h.cap}</b>
                      <span className="chip !py-0 text-[11px]">
                        {h.vang ? `${h.vang.toLocaleString('vi')} vàng` : `${h.ngoc} ngọc`}
                      </span>
                      <span className="text-xs text-ink-400">có {co(h.cap)}</span>
                    </div>
                    <p className="text-xs text-ink-500">
                      +{h.mau} máu tối đa
                      {h.coHoi < 1 && (
                        <b className="text-amber-600"> · chỉ {Math.round(h.coHoi * 100)}% thành công</b>
                      )}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <label className="block">
                    <span className="label">SL</span>
                    <input name="sl" type="number" min={1} max={MUA_TOI_DA} defaultValue={1}
                      className="input !w-20" />
                  </label>
                  <button type="submit" disabled={dangMua || !duTien}
                    className="btn-outline !py-1.5 text-sm disabled:opacity-50">Mua</button>
                </div>
              </form>
            );
          })}
        </div>
      </div>

      <div>
        <p className="label mb-2">Chọn con để cường hoá</p>
        {thu.length === 0 ? <p className="text-sm text-ink-500">Kho chưa có con nào.</p> : (
          <div className="space-y-2">
            {thu.map((t) => {
              const capSau = t.capCuong + 1;
              const ht = timHuyenTinh(capSau);
              const het = t.capCuong >= CAP_CUONG_TOI_DA;
              const duVien = !het && co(capSau) >= 1;
              return (
                <form key={t.id} action={renAction}
                  className="flex items-center gap-3 rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
                  <input type="hidden" name="thu" value={t.id} />
                  <AnhThu nguon={t.nguon} nac={t.nac} className="h-11 w-11 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-sm">{t.ten}</b>
                      <HuyHieuHe he={t.he} />
                      <span className={cn('chip !py-0 text-[11px]',
                        t.capCuong > 0 && 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300')}>
                        cường hoá {t.capCuong}
                      </span>
                    </div>
                    <p className="text-xs text-ink-400">
                      Máu {t.mau}/{t.mauToiDa}
                      {het ? ' · đã tối đa' : ` · cần huyền tinh ${capSau} (+${ht?.mau} máu)`}
                    </p>
                  </div>
                  <button type="submit" disabled={dangRen || het || !duVien}
                    className="btn-outline shrink-0 !py-1.5 text-sm disabled:opacity-50"
                    title={het ? 'Đã tối đa' : duVien ? undefined : `Cần một viên huyền tinh cấp ${capSau}`}>
                    Cường hoá
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
