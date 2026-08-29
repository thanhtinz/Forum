'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { datCua, type GameState } from '@/app/(site)/giai-tri/actions';
import { ANH, BAUCUA_CONS, BAUCUA_MAX, BAUCUA_MIN } from '@/lib/mini-game-const';
import { cn, fmtCount } from '@/lib/utils';

interface CuaDat { con: number; tong: number; nguoi: number; cuaToi: number }
export interface BanState {
  roundId: string;
  pha: 'dat' | 'xoc' | 'kq';
  conMs: number;
  dangDat: boolean;
  cua: CuaDat[];
  dice: number[] | null;
  toiDuoc: number | null;
  lichSu: { roundId: string; dice: number[] }[];
}

const ten = (id: number) => BAUCUA_CONS.find((c) => c.id === id)?.ten ?? '';
const anh = (id: number) => `${ANH}/baucua/${id}.gif`;

/**
 * Bàn bầu cua chung.
 *
 * Hỏi lại máy chủ mỗi hai giây: thấy người khác đặt cửa, thấy đồng hồ đếm
 * ngược, tới giờ thì thấy bát rung rồi mở ra. Đồng hồ chạy ở máy MÌNH giữa hai
 * lần hỏi, không thì con số giật cục hai giây một nhịp.
 */
export function BanBauCua({ ban0 }: { ban0: BanState }) {
  const [ban, setBan] = useState(ban0);
  const [conMs, setConMs] = useState(ban0.conMs);
  const [state, action, dangGui] = useActionState<GameState, FormData>(datCua, {});
  const [cua, setCua] = useState(1);

  // Ba mặt chạy loạn trong lúc xóc — chỉ để nhìn, kết quả thật do máy chủ giữ.
  const [rung, setRung] = useState([1, 1, 1]);
  const phaTruoc = useRef(ban0.pha);

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
    // Hỏi dày hơn một chút quanh lúc mở bát cho khỏi lỡ nhịp.
    const t = setInterval(hoi, 1500);
    return () => { huy = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setConMs((v) => Math.max(0, v - 200)), 200);
    return () => clearInterval(t);
  }, []);

  // Trong pha xóc thì ba mặt nhảy liên tục; hết pha thì dừng.
  useEffect(() => {
    if (ban.pha !== 'xoc') return;
    const t = setInterval(
      () => setRung([0, 0, 0].map(() => 1 + Math.floor(Math.random() * 6))),
      110,
    );
    return () => clearInterval(t);
  }, [ban.pha]);

  useEffect(() => { phaTruoc.current = ban.pha; }, [ban.pha]);

  const giay = Math.max(0, Math.ceil(conMs / 1000));
  const dangDat = ban.dangDat && conMs > 0;
  const tongBan = ban.cua.reduce((s, c) => s + c.tong, 0);
  const vuaMo = ban.pha === 'kq' && phaTruoc.current === 'xoc';

  return (
    <div className="space-y-4">
      {/* Bát: úp lại khi đang đặt, rung khi xóc, mở ra khi có kết quả */}
      <div className={cn(
        'rounded-2xl border-2 p-4 transition-colors',
        ban.pha === 'dat' && 'border-ink-100 bg-ink-50 dark:border-ink-800 dark:bg-ink-800/40',
        ban.pha === 'xoc' && 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30',
        ban.pha === 'kq' && 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/25',
      )}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">
            {ban.pha === 'dat' && `Đang nhận cửa · còn ${giay} giây`}
            {ban.pha === 'xoc' && 'Đang xóc bát…'}
            {ban.pha === 'kq' && `Mở bát · phiên sau sau ${giay} giây`}
          </p>
          <p className="retro-sub text-ink-500">
            Phiên #{ban.roundId.slice(-6)} · cả bàn {fmtCount(tongBan)} điểm
          </p>
        </div>

        <div className="mt-3 flex items-center justify-center gap-3">
          {(ban.pha === 'kq' && ban.dice ? ban.dice : ban.pha === 'xoc' ? rung : [null, null, null])
            .map((d, i) => (
              <span key={i} className={cn(
                'grid size-16 place-items-center rounded-xl bg-white shadow-sm dark:bg-ink-900',
                ban.pha === 'xoc' && 'animate-bounce',
                vuaMo && 'animate-[pulse_0.4s_ease-out_2]',
              )} style={ban.pha === 'xoc' ? { animationDelay: `${i * 90}ms` } : undefined}>
                {d == null
                  ? <span className="text-2xl text-ink-300 dark:text-ink-600">?</span>
                  // eslint-disable-next-line @next/next/no-img-element
                  : <img src={anh(d)} alt={ten(d)} title={ten(d)} className="size-12 object-contain" />}
              </span>
            ))}
        </div>

        {ban.pha === 'kq' && ban.dice && (
          <p className="mt-2 text-center text-sm">
            <b>{ban.dice.map(ten).join(' · ')}</b>
            {ban.toiDuoc != null && (
              <span className={cn('ml-2 font-bold',
                ban.toiDuoc > 0 ? 'text-emerald-600' : ban.toiDuoc < 0 ? 'text-red-500' : 'text-ink-400')}>
                {ban.toiDuoc > 0 ? `bạn ăn +${ban.toiDuoc}` : ban.toiDuoc < 0 ? `bạn thua ${-ban.toiDuoc}` : 'bạn hoà'}
              </span>
            )}
          </p>
        )}
      </div>

      {/* Bàn cờ sáu cửa */}
      <form action={action}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {BAUCUA_CONS.map((c) => {
            const o = ban.cua.find((x) => x.con === c.id);
            const chon = cua === c.id;
            const trung = ban.pha === 'kq' && ban.dice
              ? ban.dice.filter((d) => d === c.id).length : 0;
            return (
              <label key={c.id} className={cn('block', dangDat ? 'cursor-pointer' : 'cursor-not-allowed')}>
                <input type="radio" name="con" value={c.id} checked={chon} disabled={!dangDat}
                  onChange={() => setCua(c.id)} className="peer sr-only" />
                <span className={cn(
                  'relative flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-colors',
                  trung > 0
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                    : chon && dangDat
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                      : 'border-ink-200 dark:border-ink-700',
                  dangDat && !chon && 'hover:border-brand-300',
                  !dangDat && trung === 0 && 'opacity-70',
                )}>
                  {trung > 0 && (
                    <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                      {trung}
                    </span>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={anh(c.id)} alt="" width={44} height={44} className="size-11 object-contain" />
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
            {dangGui ? 'Đang đặt…' : dangDat ? `Đặt cửa ${ten(cua)}` : 'Chờ phiên sau'}
          </button>
        </div>
      </form>

      {state.ke && <p className="text-sm font-medium text-emerald-600">{state.ke}</p>}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      {/* Lịch sử: nhìn dãy bát cũ để đoán vận, đúng cái thú của người chơi lâu năm */}
      {ban.lichSu.length > 0 && (
        <div>
          <p className="label mb-1.5">Mấy phiên trước</p>
          <ul className="flex flex-wrap gap-1.5">
            {ban.lichSu.map((r) => (
              <li key={r.roundId}
                className="flex items-center gap-0.5 rounded-lg border border-ink-100 bg-white px-1.5 py-1 dark:border-ink-800 dark:bg-ink-900">
                {r.dice.map((d, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={anh(d)} alt={ten(d)} title={ten(d)} className="size-6 object-contain" />
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
