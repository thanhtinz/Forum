'use client';

import { useActionState } from 'react';
import { Lock } from 'lucide-react';
import { vaoGym, type PokeState } from '@/app/(site)/pokemon/actions';
import { SO_HUY_CHUONG, anhGym, anhHuyChuong, gymDuocVao } from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';
import { AnhThu, HuyHieuHe } from './ThePoke';

interface G {
  so: number; ten: string; he: number; cong: number; thu: number; mau: number;
  exp: number; vang: number; cau: number; ngoc: number; tangNguon: number;
}

export function BangGym({ gym, daHa, dangDanh }: { gym: G[]; daHa: number; dangDanh: boolean }) {
  const [state, action, dangChay] = useActionState<PokeState, FormData>(vaoGym, {});

  return (
    <div className="space-y-4">
      {/* Tủ huy chương: nhìn phát thấy ngay còn thiếu mấy cái. */}
      <div className="flex flex-wrap gap-1.5 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
        {gym.map((g) => {
          const anh = anhHuyChuong(g.so);
          const co = daHa >= g.so;
          return (
            <span key={g.so} title={`Huy chương ${g.so}`}
              className={cn('flex h-8 w-8 items-center justify-center rounded-full',
                co ? 'bg-amber-100 dark:bg-amber-950/50' : 'bg-ink-100 dark:bg-ink-700')}>
              {anh ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={anh} alt="" aria-hidden
                  className={cn('h-6 w-6 object-contain', !co && 'opacity-30 grayscale')}
                  style={{ imageRendering: 'pixelated' }} />
              ) : (
                <span className="text-xs font-black text-ink-400">?</span>
              )}
            </span>
          );
        })}
      </div>
      <p className="-mt-2 text-xs text-ink-400">
        Bộ ảnh gốc chỉ có {SO_HUY_CHUONG} huy chương, Gym {SO_HUY_CHUONG + 1} trở đi thiếu —
        để trống chứ không mượn tạm huy chương của Gym khác cho đủ mâm.
      </p>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ke && !state.error && <p className="man-hien text-sm font-medium text-emerald-600">{state.ke}</p>}

      {gym.map((g) => {
        const xong = daHa >= g.so;
        const moData = gymDuocVao(g.so, daHa);
        return (
          <div key={g.so} className={cn(
            'rounded-xl border-2 p-3 transition-colors',
            xong ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'
              : moData ? 'border-brand-400' : 'border-ink-200 opacity-70 dark:border-ink-700',
          )}>
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anhGym(g.so)} alt="" aria-hidden className="h-14 w-14 shrink-0 object-contain"
                style={{ imageRendering: 'pixelated' }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">{g.ten}</b>
                  <HuyHieuHe he={g.he} />
                  {xong && <span className="text-[11px] font-bold text-emerald-600">đã hạ</span>}
                </div>
                <p className="mt-0.5 text-xs text-ink-400">
                  Công {g.cong} · thủ {g.thu} · máu {g.mau}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  Thưởng: {g.vang} vàng, {g.exp} KN, {g.cau} cầu, {g.ngoc} ngọc
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xs text-ink-400">Tặng kèm</span>
                  <AnhThu nguon={g.tangNguon} className="h-8 w-8" />
                </div>
              </div>
            </div>

            <div className="mt-2.5">
              {xong ? null : moData ? (
                <form action={action}>
                  <input type="hidden" name="gym" value={g.so} />
                  <button disabled={dangChay || dangDanh}
                    className="btn-primary !py-1.5 text-sm disabled:opacity-60">
                    {dangDanh ? 'Đang đánh dở trận khác' : 'Thách đấu'}
                  </button>
                </form>
              ) : (
                <p className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Lock size={12} /> Hạ Gym {daHa + 1} trước đã
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
