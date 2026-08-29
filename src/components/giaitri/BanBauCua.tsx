'use client';

import { useActionState, useEffect, useState } from 'react';
import { Coins, Users } from 'lucide-react';
import { datCua, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, BAUCUA_CONS, BAUCUA_MAX, BAUCUA_MIN } from '@/lib/mini-game-const';
import { cn, fmtCount } from '@/lib/utils';

interface CuaDat { con: number; tong: number; nguoi: number; cuaToi: number }
export interface BanState {
  roundId: string;
  conMs: number;
  dangDat: boolean;
  cua: CuaDat[];
  truoc: { roundId: string; dice: number[]; anMs: number } | null;
  toiDuoc: number | null;
}

const ten = (id: number) => BAUCUA_CONS.find((c) => c.id === id)!.ten;

/**
 * Bàn bầu cua chung.
 *
 * Hỏi lại máy chủ mỗi hai giây: thấy người khác đặt cửa, thấy đồng hồ đếm
 * ngược, và tới giờ thì thấy bát mở ra. Đồng hồ chạy ở máy MÌNH giữa hai lần
 * hỏi, không thì con số giật cục hai giây một nhịp.
 */
export function BanBauCua({ ban0, diem0 }: { ban0: BanState; diem0: number }) {
  const [ban, setBan] = useState(ban0);
  const [conMs, setConMs] = useState(ban0.conMs);
  const [state, action, dangGui] = useActionState<GameState, FormData>(datCua, {});
  const [cua, setCua] = useState(1);
  const [diem, setDiem] = useState(diem0);

  // Hỏi lại máy chủ. Chính lượt hỏi này cũng là thứ khiến phiên hết giờ được
  // chốt sổ, nên trang cứ mở là bàn tự chạy.
  useEffect(() => {
    let huy = false;
    const hoi = async () => {
      try {
        const r = await fetch('/api/bau-cua', { cache: 'no-store' });
        if (!r.ok || huy) return;
        const d: BanState = await r.json();
        setBan(d);
        setConMs(d.conMs);
      } catch { /* mạng chập chờn thì lượt sau hỏi lại */ }
    };
    const t = setInterval(hoi, 2000);
    return () => { huy = true; clearInterval(t); };
  }, []);

  // Đồng hồ chạy mượt giữa hai lần hỏi.
  useEffect(() => {
    const t = setInterval(() => setConMs((v) => Math.max(0, v - 200)), 200);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (state.ok) setDiem((d) => d); }, [state.ok]);

  const giay = Math.ceil(conMs / 1000);
  const dangDat = ban.dangDat && conMs > 0;
  const tongBan = ban.cua.reduce((s, c) => s + c.tong, 0);

  return (
    <div className="space-y-4">
      {/* Đồng hồ phiên */}
      <div className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3',
        dangDat ? 'bg-brand-50 dark:bg-brand-950/40' : 'bg-amber-50 dark:bg-amber-950/30',
      )}>
        <div>
          <p className="text-sm font-bold">
            {dangDat ? `Còn ${giay} giây đặt cửa` : 'Đang xóc bát…'}
          </p>
          <p className="retro-sub text-ink-500">
            Phiên #{ban.roundId.slice(-6)} · cả bàn đang đặt {fmtCount(tongBan)} điểm
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-sm">
          <Coins size={15} className="text-amber-500" /> <b>{fmtCount(diem)}</b>
        </span>
      </div>

      {/* Bát vừa mở */}
      {ban.truoc && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
          <span className="retro-sub text-ink-400">Phiên trước</span>
          {ban.truoc.dice.map((d, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={`${ANH}/baucua/${d}.gif`} alt={ten(d)} title={ten(d)}
              className="size-11 rounded-lg bg-white object-contain p-0.5 shadow-sm dark:bg-ink-900" />
          ))}
          <span className="text-sm text-ink-500">{ban.truoc.dice.map(ten).join(' · ')}</span>
          {ban.toiDuoc != null && (
            <span className={cn('ml-auto text-sm font-bold',
              ban.toiDuoc > 0 ? 'text-emerald-600' : ban.toiDuoc < 0 ? 'text-red-500' : 'text-ink-400')}>
              {ban.toiDuoc > 0 ? `Bạn ăn +${ban.toiDuoc}` : ban.toiDuoc < 0 ? `Bạn thua ${-ban.toiDuoc}` : 'Bạn hoà'}
            </span>
          )}
        </div>
      )}

      {/* Bàn cờ sáu cửa */}
      <form action={action}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {BAUCUA_CONS.map((c) => {
            const o = ban.cua.find((x) => x.con === c.id);
            const chon = cua === c.id;
            return (
              <label key={c.id} className={cn('block', dangDat ? 'cursor-pointer' : 'cursor-not-allowed')}>
                <input type="radio" name="con" value={c.id} checked={chon} disabled={!dangDat}
                  onChange={() => setCua(c.id)} className="peer sr-only" />
                <span className={cn(
                  'flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-colors',
                  chon ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                       : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
                  !dangDat && 'opacity-60',
                )}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`${ANH}/baucua/${c.id}.gif`} alt="" width={44} height={44}
                    className="size-11 object-contain" />
                  <span className="text-xs font-semibold">{c.ten}</span>
                  <span className="retro-sub flex items-center gap-1 text-ink-400">
                    <Users size={11} /> {o?.nguoi ?? 0} · {fmtCount(o?.tong ?? 0)}
                  </span>
                  {(o?.cuaToi ?? 0) > 0 && (
                    <span className="chip !py-0 bg-amber-100 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      bạn {o!.cuaToi}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="label">Đặt (điểm)</span>
            <input name="cuoc" type="number" min={BAUCUA_MIN} max={BAUCUA_MAX} defaultValue={BAUCUA_MIN}
              disabled={!dangDat} className="input !w-32" />
          </label>
          <button type="submit" disabled={dangGui || !dangDat} className="btn-primary disabled:opacity-60">
            {dangGui ? 'Đang đặt…' : `Đặt cửa ${ten(cua)}`}
          </button>
        </div>
      </form>

      {state.ke && <p className="text-sm font-medium text-emerald-600">{state.ke}</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
