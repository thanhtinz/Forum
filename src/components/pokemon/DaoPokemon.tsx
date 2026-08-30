'use client';

import { useActionState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import {
  boChay, doiKhu, nemCau, raChieu, timThu, type PokeState,
} from '@/app/(site)/pokemon/actions';
import { CO_HOI_BAT, boThu, expChoCap, heSoHe, tenHe, tinhSatThuong } from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';
import { AnhThu, HuyHieuHe, ThanhMau } from './ThePoke';

interface Thu {
  id: string; ten: string; nguon: number; nac: number; he: number;
  cap: number; exp: number; mau: number; mauToiDa: number;
  chieu: string[]; c: number[];
}
interface Tran {
  ten: string; nguon: number; nac: number; he: number;
  mau: number; mauToiDa: number; cong: number; thu: number;
  exp: number; vang: number; ke: string | null;
}
interface NV {
  ten: string; vang: number; exp: number; cap: number;
  sk: number; skToiDa: number; cau: number; da: number; khu: string;
}
interface Khu { ma: string; ten: string; bac: number; mo: string }

export function DaoPokemon({ nv, raTran, tran, khuHienTai, soTrongKhu, khuMo }: {
  nv: NV; raTran: Thu | null | undefined; tran: Tran | null;
  khuHienTai: Khu; soTrongKhu: number; khuMo: (Khu & { mo_cap: number })[];
}) {
  return (
    <>
      <BangNhanVat nv={nv} raTran={raTran} />
      {tran && raTran
        ? <ManDanh tran={tran} toi={raTran} coCau={nv.cau} />
        : <ManDi khu={khuHienTai} soTrongKhu={soTrongKhu} khuMo={khuMo} nv={nv} />}
    </>
  );
}

// ─────────────────────────── Bảng nhân vật ───────────────────────────

function BangNhanVat({ nv, raTran }: { nv: NV; raTran: Thu | null | undefined }) {
  return (
    <section className="card p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        <b className="text-base">{nv.ten}</b>
        <span className="text-ink-500">Cấp {nv.cap}</span>
        <O nhan="Vàng" giaTri={nv.vang} mau="text-amber-600" />
        <O nhan="Cầu" giaTri={nv.cau} mau="text-rose-600" />
        <O nhan="Đá" giaTri={nv.da} mau="text-violet-600" />
        <O nhan="KN" giaTri={nv.exp} mau="text-sky-600" />
        <span className="ml-auto text-xs text-ink-400">Thể lực {nv.sk}/{nv.skToiDa}</span>
      </div>
      <div className="mt-2"><ThanhMau mau={nv.sk} toiDa={nv.skToiDa} nho /></div>
      <p className="mt-1.5 text-xs text-ink-400">
        Cấp {nv.cap + 1} ở {expChoCap(nv.cap + 1)} kinh nghiệm
        {' — còn '}{Math.max(0, expChoCap(nv.cap + 1) - nv.exp)}
      </p>

      {raTran && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
          <AnhThu nguon={raTran.nguon} nac={raTran.nac} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-sm">{raTran.ten}</b>
              <HuyHieuHe he={raTran.he} />
              <span className="text-xs text-ink-400">Cấp {raTran.cap} · {raTran.exp} KN</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <ThanhMau mau={raTran.mau} toiDa={raTran.mauToiDa} nho />
              <span className="shrink-0 text-xs tabular-nums text-ink-500">
                {raTran.mau}/{raTran.mauToiDa}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function O({ nhan, giaTri, mau }: { nhan: string; giaTri: number; mau: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="text-xs text-ink-400">{nhan}</span>
      <b className={cn('tabular-nums', mau)}>{giaTri}</b>
    </span>
  );
}

// ─────────────────────────── Màn đi tìm thú ───────────────────────────

function ManDi({ khu, soTrongKhu, khuMo, nv }: {
  khu: Khu; soTrongKhu: number; khuMo: (Khu & { mo_cap: number })[]; nv: NV;
}) {
  const [tim, timAction, dangTim] = useActionState<PokeState, FormData>(timThu, {});
  const [doi, doiAction, dangDoi] = useActionState<PokeState, FormData>(doiKhu, {});

  return (
    <>
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <MapPin size={16} className="text-brand-500" />
          <b>{khu.ten}</b>
          <span className="chip !py-0.5 text-[11px]">Bậc {khu.bac}</span>
          <span className="text-xs text-ink-400">{soTrongKhu} loài</span>
        </div>
        <p className="mt-1 text-sm text-ink-500">{khu.mo}</p>

        <form action={timAction} className="mt-4">
          <button type="submit" disabled={dangTim || nv.sk < 2}
            className="btn-primary w-full justify-center gap-1.5 disabled:opacity-60">
            {dangTim ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {dangTim ? 'Đang lùng…' : 'Tìm thú'}
          </button>
        </form>
        {nv.sk < 2 && (
          <p className="mt-2 text-sm text-amber-600">
            Hết thể lực rồi — vào trạm y tế nghỉ đã.
          </p>
        )}
        {tim.error && <p className="mt-2 text-sm text-red-600">{tim.error}</p>}
        {tim.ke && !tim.error && <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{tim.ke}</p>}
      </section>

      <section className="card p-5">
        <h2 className="zib-title mb-3">Mười bốn khu</h2>
        {doi.error && <p className="mb-2 text-sm text-red-600">{doi.error}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {khuMo.map((k) => {
            const dangO = k.ma === khu.ma;
            const khoa = nv.cap < k.mo_cap;
            return (
              <form key={k.ma} action={doiAction}>
                <input type="hidden" name="khu" value={k.ma} />
                <button type="submit" disabled={dangO || khoa || dangDoi}
                  className={cn(
                    'w-full rounded-xl border-2 p-3 text-left transition-colors',
                    dangO
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/40'
                      : khoa
                        ? 'cursor-not-allowed border-ink-100 opacity-55 dark:border-ink-800'
                        : 'border-ink-200 hover:border-brand-300 dark:border-ink-700',
                  )}>
                  <span className="flex items-center gap-2">
                    <b className="text-sm">{k.ten}</b>
                    <span className="chip !py-0 text-[10px]">Bậc {k.bac}</span>
                    {dangO && <span className="text-[11px] font-bold text-brand-600">đang ở đây</span>}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-400">
                    {khoa ? `Mở từ cấp ${k.mo_cap}` : k.mo}
                  </span>
                </button>
              </form>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ─────────────────────────── Màn đánh nhau ───────────────────────────

function ManDanh({ tran, toi, coCau }: { tran: Tran; toi: Thu; coCau: number }) {
  const [danh, danhAction, dangDanh] = useActionState<PokeState, FormData>(raChieu, {});
  const [bat, batAction, dangBat] = useActionState<PokeState, FormData>(nemCau, {});
  const [chay, chayAction, dangChay] = useActionState<PokeState, FormData>(boChay, {});
  const ban = dangDanh || dangBat || dangChay;

  // Xem trước hệ số hệ: chính là thứ quyết định nên ra chiêu hay nên bỏ chạy,
  // mà bản gốc chẳng nói gì cả — người chơi phải tự đoán qua từng trận.
  const [nGay, nChiu] = heSoHe(toi.he, tran.he);
  const boThuToi = boThu({ c1: toi.c[0]!, c2: toi.c[1]!, c3: toi.c[2]!, c4: toi.c[3]! });

  return (
    <section className="card p-5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <BenDanh ten={toi.ten} nguon={toi.nguon} nac={toi.nac} he={toi.he}
          mau={toi.mau} mauToiDa={toi.mauToiDa} lat />
        <span className="text-center text-xs font-black text-ink-300">VS</span>
        <BenDanh ten={tran.ten} nguon={tran.nguon} nac={tran.nac} he={tran.he}
          mau={tran.mau} mauToiDa={tran.mauToiDa} />
      </div>

      <p className="mt-3 text-center text-xs text-ink-400">
        {tenHe(toi.he)} đánh {tenHe(tran.he)}:{' '}
        <b className={cn(nGay > 1 ? 'text-emerald-600' : nGay < 1 ? 'text-rose-600' : 'text-ink-500')}>
          {nGay === 0 ? 'vô hiệu' : `sát thương ×${nGay}`}
        </b>
        {' · '}
        <b className={cn(nChiu > 1 ? 'text-rose-600' : nChiu < 1 ? 'text-emerald-600' : 'text-ink-500')}>
          chịu ×{nChiu}
        </b>
      </p>

      {(danh.ke ?? tran.ke) && !danh.error && (
        <p className="man-hien mt-3 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800/50">
          {danh.ke ?? tran.ke}
        </p>
      )}
      {bat.ke && !bat.error && (
        <p className="man-hien mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {bat.ke}
        </p>
      )}
      {(danh.error ?? bat.error ?? chay.error) && (
        <p className="mt-3 text-sm text-red-600">{danh.error ?? bat.error ?? chay.error}</p>
      )}

      <form action={danhAction} className="mt-4">
        <p className="label mb-2">Ra chiêu</p>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map((i) => {
            const { gay } = tinhSatThuong(toi.c[i]!, boThuToi, toi.he, tran.cong, tran.thu, tran.he);
            return (
              <button key={i} type="submit" name="chieu" value={i + 1} disabled={ban}
                className="rounded-xl border-2 border-ink-200 p-2.5 text-left transition-colors hover:border-brand-400 disabled:opacity-60 dark:border-ink-700">
                <span className="block truncate text-sm font-bold">
                  {toi.chieu[i] || `Chiêu ${i + 1}`}
                </span>
                <span className="text-[11px] text-ink-400">
                  gây khoảng {gay} máu
                </span>
              </button>
            );
          })}
        </div>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={batAction}>
          <button type="submit" disabled={ban || coCau < 1} className="btn-outline gap-1.5 !py-1.5 text-sm disabled:opacity-60">
            {dangBat ? <Loader2 size={14} className="animate-spin" /> : null}
            Ném cầu ({coCau})
          </button>
        </form>
        <form action={chayAction}>
          <button type="submit" disabled={ban} className="btn !py-1.5 text-sm">Bỏ chạy</button>
        </form>
        <span className="ml-auto self-center text-xs text-ink-400">
          Bắt trúng khoảng {Math.round(CO_HOI_BAT * 100)}%
        </span>
      </div>
    </section>
  );
}

function BenDanh({ ten, nguon, nac, he, mau, mauToiDa, lat }: {
  ten: string; nguon: number; nac: number; he: number;
  mau: number; mauToiDa: number; lat?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border-2 border-ink-100 p-3 text-center dark:border-ink-800">
      <AnhThu nguon={nguon} nac={nac} lat={lat} className="mx-auto h-16 w-auto" />
      <b className="mt-1 block truncate text-sm">{ten}</b>
      <span className="mt-0.5 flex justify-center"><HuyHieuHe he={he} /></span>
      <div className="mt-1.5"><ThanhMau mau={mau} toiDa={mauToiDa} /></div>
      <span className="text-[11px] tabular-nums text-ink-500">{mau}/{mauToiDa}</span>
    </div>
  );
}
