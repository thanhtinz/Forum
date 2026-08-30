'use client';

import { useActionState } from 'react';
import { Crown, Lock, Unlock } from 'lucide-react';
import {
  khoaQuyBang, lapBang, quyBang, roiBang, vaoBang, type PokeState,
} from '@/app/(site)/pokemon/actions';
import {
  BANG_CAP_TOI_THIEU, BANG_GIA_NGOC, BANG_TEN_TOI_DA, BANG_TEN_TOI_THIEU,
} from '@/lib/pokemon-const';

interface Bang {
  id: string; ten: string; vang: number; ngoc: number;
  cong: number; thu: number; sucChua: number; khoaQuy: boolean; truongId: string;
  thanhVien: { id: string; ten: string; cap: number; thangDau: number }[];
}
interface Tom { id: string; ten: string; truong: string; soNguoi: number; sucChua: number }

export function BangHoi({ bang, danhSach, toiId, cap, ngoc, vang }: {
  toiId: string; cap: number; ngoc: number; vang: number;
  bang: Bang | null; danhSach: Tom[];
}) {
  const [lap, lapAction, dangLap] = useActionState<PokeState, FormData>(lapBang, {});
  const [vao, vaoAction, dangVao] = useActionState<PokeState, FormData>(vaoBang, {});
  const [roi, roiAction, dangRoi] = useActionState<PokeState, FormData>(roiBang, {});
  const [quy, quyAction, dangQuy] = useActionState<PokeState, FormData>(quyBang, {});
  const [khoa, khoaAction, dangKhoa] = useActionState<PokeState, FormData>(khoaQuyBang, {});
  const loi = lap.error ?? vao.error ?? roi.error ?? quy.error ?? khoa.error;
  const ke = lap.ke ?? vao.ke ?? roi.ke ?? quy.ke ?? khoa.ke;

  const bao = (
    <>
      {loi && <p className="text-sm text-red-600">{loi}</p>}
      {ke && !loi && <p className="man-hien text-sm font-medium text-emerald-600">{ke}</p>}
    </>
  );

  // ── Đang ở trong bang ─────────────────────────────────────────────────
  if (bang) {
    const laTruong = bang.truongId === toiId;
    return (
      <div className="space-y-4">
        {bao}
        <div className="rounded-xl border-2 border-brand-400 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-base">{bang.ten}</b>
            {laTruong && <span className="chip !py-0 gap-1 text-[11px]"><Crown size={11} /> trưởng bang</span>}
            <span className="text-xs text-ink-400">
              {bang.thanhVien.length}/{bang.sucChua} người
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Quỹ: <b>{bang.vang}</b> vàng, <b>{bang.ngoc}</b> ngọc ·
            {' '}chỉ số bang: công {bang.cong}, thủ {bang.thu}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-400">
            {bang.khoaQuy ? <><Lock size={12} /> Quỹ đang khoá — chỉ trưởng bang rút được</>
              : <><Unlock size={12} /> Quỹ đang mở cho cả bang</>}
          </p>
        </div>

        <div>
          <p className="label mb-2">Thành viên</p>
          <ul className="space-y-1.5">
            {bang.thanhVien.map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm dark:bg-ink-800/50">
                <b>{m.ten}</b>
                {m.id === bang.truongId && <Crown size={12} className="text-amber-500" />}
                <span className="text-xs text-ink-400">cấp {m.cap}</span>
                <span className="ml-auto text-xs text-ink-400">{m.thangDau} trận thắng</span>
              </li>
            ))}
          </ul>
        </div>

        <form action={quyAction} className="rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
          <p className="label mb-2">Quỹ vàng</p>
          <p className="mb-2 text-xs text-ink-500">Bạn đang có {vang} vàng.</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="label">Số vàng</span>
              <input name="so" type="number" min={1} defaultValue={10} className="input !w-28" />
            </label>
            <button type="submit" name="huong" value="gop" disabled={dangQuy}
              className="btn-primary !py-1.5 text-sm">Góp vào</button>
            <button type="submit" name="huong" value="rut" disabled={dangQuy}
              className="btn-outline !py-1.5 text-sm">Rút ra</button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          {laTruong && (
            <form action={khoaAction}>
              <button disabled={dangKhoa} className="btn-outline gap-1.5 !py-1.5 text-sm">
                {bang.khoaQuy ? <><Unlock size={14} /> Mở quỹ</> : <><Lock size={14} /> Khoá quỹ</>}
              </button>
            </form>
          )}
          <form action={roiAction}>
            <button disabled={dangRoi} className="btn !py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
              {laTruong ? 'Giải tán bang' : 'Rời bang'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Chưa vào bang nào ─────────────────────────────────────────────────
  const duCap = cap >= BANG_CAP_TOI_THIEU;
  return (
    <div className="space-y-4">
      {bao}

      <form action={lapAction} className="rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
        <p className="label mb-2">Lập bang mới</p>
        <p className="mb-2 text-xs text-ink-500">
          Tốn {BANG_GIA_NGOC} ngọc — bạn đang có {ngoc}. Ngọc chỉ có ở Gym, nên lập
          bang là chuyện của người đã đi hết một chặng.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="label">Tên bang</span>
            <input name="ten" className="input !w-52" minLength={BANG_TEN_TOI_THIEU}
              maxLength={BANG_TEN_TOI_DA} placeholder="Hội Săn Thú" required />
          </label>
          <button type="submit" disabled={dangLap || ngoc < BANG_GIA_NGOC}
            className="btn-primary !py-1.5 text-sm disabled:opacity-50">Lập bang</button>
        </div>
      </form>

      <div>
        <p className="label mb-2">Bang đang có</p>
        {!duCap && (
          <p className="mb-2 text-sm text-amber-600">
            Phải đạt cấp {BANG_CAP_TOI_THIEU} mới gia nhập được — bạn đang cấp {cap}.
          </p>
        )}
        {danhSach.length === 0 ? (
          <p className="text-sm text-ink-500">Chưa có bang nào trên đảo.</p>
        ) : (
          <div className="space-y-2">
            {danhSach.map((b) => {
              const day = b.soNguoi >= b.sucChua;
              return (
                <form key={b.id} action={vaoAction}
                  className="flex items-center gap-3 rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
                  <input type="hidden" name="bang" value={b.id} />
                  <div className="min-w-0 flex-1">
                    <b className="text-sm">{b.ten}</b>
                    <p className="text-xs text-ink-400">
                      Trưởng bang {b.truong} · {b.soNguoi}/{b.sucChua} người
                    </p>
                  </div>
                  <button disabled={dangVao || !duCap || day}
                    className="btn-outline shrink-0 !py-1.5 text-sm disabled:opacity-50"
                    title={day ? 'Bang đã đủ người' : !duCap ? `Cần cấp ${BANG_CAP_TOI_THIEU}` : undefined}>
                    {day ? 'Đủ người' : 'Gia nhập'}
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
