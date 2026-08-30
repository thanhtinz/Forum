'use client';

import { useActionState, useState } from 'react';
import { FlaskConical, Shield, Shirt, Sword, HardHat } from 'lucide-react';
import { coiDo, macDo, muaDo, uongThuoc, type PokeState } from '@/app/(site)/pokemon/actions';
import { MUA_DO_TOI_DA, O_TRANG_BI, boThu, congTrangBi, tenLoaiDo } from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';
import { ThanhMau } from './ThePoke';

interface Hang {
  ma: number; ten: string; loai: string;
  cong: number; thu: number; mu: number; giap: number; mau: number;
  cap: number; vang: number; ngoc: number;
}
interface Mon {
  id: string; ten: string; loai: string;
  cong: number; thu: number; mu: number; giap: number; mau: number;
  dangMac: boolean; sl: number;
}
interface Con { ten: string; mau: number; mauToiDa: number; c: number[] }

const ICON: Record<string, typeof Sword> = {
  weapon: Sword, shield: Shield, golova: HardHat, body: Shirt, elixir: FlaskConical,
};

export function TrangBi({ hang, tui, cap, vang, ngoc, con }: {
  hang: Hang[]; tui: Mon[]; cap: number; vang: number; ngoc: number;
  con: Con | null | undefined;
}) {
  const [mua, muaAction, dangMua] = useActionState<PokeState, FormData>(muaDo, {});
  const [mac, macAction, dangMac] = useActionState<PokeState, FormData>(macDo, {});
  const [coi, coiAction, dangCoi] = useActionState<PokeState, FormData>(coiDo, {});
  const [uong, uongAction, dangUong] = useActionState<PokeState, FormData>(uongThuoc, {});
  const [xemLoai, setXemLoai] = useState<string>('weapon');
  const loi = mua.error ?? mac.error ?? coi.error ?? uong.error;
  const ke = !loi ? (mua.ke ?? mac.ke ?? coi.ke ?? uong.ke) : null;

  const dangMacDs = tui.filter((d) => d.dangMac);
  const them = congTrangBi(dangMacDs);
  const thuoc = tui.filter((d) => d.loai === 'elixir' && d.sl > 0);

  return (
    <div className="space-y-4">
      {loi && <p className="text-sm text-red-600">{loi}</p>}
      {ke && <p className="man-hien text-sm font-medium text-emerald-600">{ke}</p>}

      {/* ── Bốn ô đang mặc ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {O_TRANG_BI.map((o) => {
          const dang = dangMacDs.find((d) => d.loai === o.loai);
          const Icon = ICON[o.loai]!;
          return (
            <div key={o.loai} className={cn(
              'rounded-xl border-2 p-3 text-center',
              dang ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-950/30' : 'border-dashed border-ink-200 dark:border-ink-700',
            )}>
              <Icon size={18} className={cn('mx-auto', dang ? 'text-brand-600' : 'text-ink-300')} />
              <p className="mt-1 text-[11px] font-semibold text-ink-400">{o.ten}</p>
              {dang ? (
                <>
                  <b className="block text-sm">{dang.ten}</b>
                  <form action={coiAction}>
                    <input type="hidden" name="do" value={dang.id} />
                    <button disabled={dangCoi} className="mt-1 text-[11px] text-ink-400 underline hover:text-red-600">
                      cởi ra
                    </button>
                  </form>
                </>
              ) : <span className="text-xs text-ink-300">trống</span>}
            </div>
          );
        })}
      </div>

      {con && (
        <div className="rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800/50">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <b>{con.ten}</b>
            <span className="text-ink-500">
              chiêu mạnh nhất {Math.max(...con.c)}
              {them.cong > 0 && <b className="text-emerald-600"> +{them.cong}</b>}
            </span>
            <span className="text-ink-500">
              thủ {boThu({ c1: con.c[0]!, c2: con.c[1]!, c3: con.c[2]!, c4: con.c[3]! })}
              {them.thu > 0 && <b className="text-emerald-600"> +{them.thu}</b>}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <ThanhMau mau={con.mau} toiDa={con.mauToiDa} nho />
            <span className="shrink-0 text-xs tabular-nums text-ink-500">{con.mau}/{con.mauToiDa}</span>
          </div>
        </div>
      )}

      {/* ── Thuốc trong túi ────────────────────────────────────────────── */}
      {thuoc.length > 0 && (
        <div>
          <p className="label mb-2">Thuốc trong túi</p>
          <div className="flex flex-wrap gap-2">
            {thuoc.map((t) => (
              <form key={t.id} action={uongAction}>
                <input type="hidden" name="do" value={t.id} />
                <button disabled={dangUong} className="btn-outline gap-1.5 !py-1.5 text-sm">
                  <FlaskConical size={14} /> {t.ten} (+{t.mau}) ×{t.sl}
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* ── Túi đồ ─────────────────────────────────────────────────────── */}
      <div>
        <p className="label mb-2">Túi đồ</p>
        {tui.filter((d) => d.loai !== 'elixir').length === 0 ? (
          <p className="text-sm text-ink-500">Túi chưa có món trang bị nào.</p>
        ) : (
          <div className="space-y-1.5">
            {tui.filter((d) => d.loai !== 'elixir').map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm dark:bg-ink-800/50">
                <b>{tenLoaiDo(d.loai)} {d.ten}</b>
                <span className="text-xs text-ink-400">
                  {[d.cong && `công +${d.cong}`, (d.thu + d.mu + d.giap) && `thủ +${d.thu + d.mu + d.giap}`]
                    .filter(Boolean).join(' · ')}
                </span>
                {d.dangMac ? (
                  <span className="ml-auto text-[11px] font-bold text-brand-600">đang mặc</span>
                ) : (
                  <form action={macAction} className="ml-auto">
                    <input type="hidden" name="do" value={d.id} />
                    <button disabled={dangMac} className="btn-outline !py-1 text-xs">Mặc vào</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quầy hàng ──────────────────────────────────────────────────── */}
      <div>
        <p className="label mb-2">Quầy hàng</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {[...O_TRANG_BI.map((o) => ({ loai: o.loai as string, ten: o.ten })), { loai: 'elixir', ten: 'Thuốc' }]
            .map((o) => (
              <button key={o.loai} type="button" onClick={() => setXemLoai(o.loai)}
                className={cn('chip !py-1 text-xs',
                  xemLoai === o.loai
                    ? 'bg-brand-500 text-white'
                    : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300')}>
                {o.ten}
              </button>
            ))}
        </div>
        <div className="space-y-1.5">
          {hang.filter((h) => h.loai === xemLoai).map((h) => {
            const duCap = cap >= h.cap;
            const duTien = vang >= h.vang && ngoc >= h.ngoc;
            const chiSo = h.loai === 'elixir'
              ? `hồi ${h.mau} máu`
              : [h.cong && `công +${h.cong}`, (h.thu + h.mu + h.giap) && `thủ +${h.thu + h.mu + h.giap}`]
                  .filter(Boolean).join(' · ');
            return (
              <form key={h.ma} action={muaAction}
                className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-ink-200 px-3 py-2 text-sm dark:border-ink-700">
                <input type="hidden" name="ma" value={h.ma} />
                <b>{h.ten}</b>
                <span className="text-xs text-ink-400">{chiSo}</span>
                <span className={cn('chip !py-0 text-[11px]', !duCap && 'text-amber-600')}>cấp {h.cap}</span>
                <span className="chip !py-0 text-[11px]">
                  {[h.vang && `${h.vang.toLocaleString('vi')} vàng`, h.ngoc && `${h.ngoc} ngọc`]
                    .filter(Boolean).join(' + ')}
                </span>
                {h.loai === 'elixir' && (
                  <input name="sl" type="number" min={1} max={MUA_DO_TOI_DA} defaultValue={1}
                    className="input !w-16 !py-1 text-xs" />
                )}
                <button disabled={dangMua || !duCap || !duTien}
                  className="btn-outline ml-auto !py-1 text-xs disabled:opacity-50"
                  title={!duCap ? `Cần cấp ${h.cap}` : !duTien ? 'Không đủ tiền' : undefined}>
                  Mua
                </button>
              </form>
            );
          })}
        </div>
      </div>
    </div>
  );
}
