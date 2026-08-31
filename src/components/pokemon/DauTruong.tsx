'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, History, Swords, Zap } from 'lucide-react';
import {
  danhDau, ghepKeoNhanh, huyKeo, taoKeo, vaoKeo, type PokeState,
} from '@/app/(site)/pokemon/actions';
import { DAU_CAP_MAX, DAU_CAP_MIN } from '@/lib/pokemon-const';
import { cn } from '@/lib/utils';
import { AnhThu, HuyHieuHe, ThanhMau } from './ThePoke';

interface Ben {
  ten: string; nguon: number; nac: number; he: number;
  mau: number; mauToiDa: number; chieu: number[]; tenChieu: string[]; nguoi: string;
}
interface Tran {
  id: string; laChu: boolean; coDoi: boolean; luotCua: string | null;
  hanLuc: number; ke: string | null; capMin: number; capMax: number;
  chu: Ben; doi: Ben | null;
}
interface Keo {
  id: string; nguoi: string; cap: number; capMin: number; capMax: number;
  hanLuc: number; ten: string; nguon: number; nac: number; he: number; diem: number;
}
interface Con { ten: string; nguon: number; nac: number; he: number; mau: number; mauToiDa: number }
interface TranXong { id: string; doiThu: string; thang: boolean; hoa: boolean; luc: number }
interface HangBang { id: string; ten: string; diem: number; thang: number; laToi: boolean }

export function DauTruong({ tran, keo, cap, con, diem, tenHang, xong, bang }: {
  toiId: string; cap: number; con: Con | null | undefined;
  tran: Tran | null; keo: Keo[];
  diem: number; tenHang: string | null; xong: TranXong[]; bang: HangBang[];
}) {
  if (tran) return <ManDau tran={tran} />;
  return (
    <SanKeo keo={keo} cap={cap} con={con} diem={diem} tenHang={tenHang}
      xong={xong} bang={bang} />
  );
}

/** Đồng hồ đếm ngược, tự làm mới trang khi hết giờ để thấy kết quả chốt. */
function DemNguoc({ den, khiHet }: { den: number; khiHet?: () => void }) {
  const [con, setCon] = useState(() => Math.max(0, den - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      const c = Math.max(0, den - Date.now());
      setCon(c);
      if (c === 0) khiHet?.();
    }, 1000);
    return () => clearInterval(t);
  }, [den, khiHet]);
  const g = Math.ceil(con / 1000);
  return <span className="tabular-nums">{Math.floor(g / 60)}:{String(g % 60).padStart(2, '0')}</span>;
}

// ─────────────────────────── Sàn kèo ───────────────────────────

function SanKeo({ keo, cap, con, diem, tenHang, xong, bang }: {
  keo: Keo[]; cap: number; con: Con | null | undefined;
  diem: number; tenHang: string | null; xong: TranXong[]; bang: HangBang[];
}) {
  const [tao, taoAction, dangTao] = useActionState<PokeState, FormData>(taoKeo, {});
  const [vao, vaoAction, dangVao] = useActionState<PokeState, FormData>(vaoKeo, {});
  const [nhanh, nhanhAction, dangNhanh] = useActionState<PokeState, FormData>(ghepKeoNhanh, {});
  const loi = tao.error ?? vao.error ?? nhanh.error;

  return (
    <div className="space-y-4">
      {loi && <p className="text-sm text-red-600">{loi}</p>}
      {(tao.ke ?? vao.ke ?? nhanh.ke) && !loi && (
        <p className="man-hien text-sm font-medium text-emerald-600">
          {tao.ke ?? vao.ke ?? nhanh.ke}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-brand-400 p-3">
        <b className="text-base tabular-nums">{diem}</b>
        <span className="text-xs text-ink-500">điểm mùa này</span>
        {tenHang && <span className="chip !py-0 text-[11px]">{tenHang}</span>}
        {/* Ghép nhanh gộp "đọc danh sách rồi bấm" và "mở kèo rồi ngồi chờ" vào
            một cú bấm — trên một diễn đàn nhỏ, phần lớn thời gian chỉ có đúng
            một kèo đang mở. */}
        <form action={nhanhAction} className="ml-auto">
          <button disabled={dangNhanh || !con}
            className="btn-primary gap-1.5 !py-1.5 text-sm disabled:opacity-50">
            <Zap size={14} /> Ghép kèo nhanh
          </button>
        </form>
      </div>

      {con ? (
        <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
          <AnhThu nguon={con.nguon} nac={con.nac} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-ink-400">Ra sàn</span>
              <b className="text-sm">{con.ten}</b>
              <HuyHieuHe he={con.he} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <ThanhMau mau={con.mau} toiDa={con.mauToiDa} nho />
              <span className="shrink-0 text-xs tabular-nums text-ink-500">{con.mau}/{con.mauToiDa}</span>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-500">Bạn chưa có con thú nào để ra sàn.</p>
      )}

      <form action={taoAction} className="rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
        <p className="label mb-2">Mở kèo</p>
        <p className="mb-2 text-xs text-ink-500">
          Đặt khoảng cấp bạn chịu tiếp. Bản gốc bắt tự gõ hai con số, giữ nguyên vậy —
          nó là cách duy nhất để không bị người cấp cao hơn hẳn nhảy vào bắt nạt.
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="label">Cấp tối thiểu</span>
            <input name="min" type="number" min={DAU_CAP_MIN} max={DAU_CAP_MAX}
              defaultValue={Math.max(DAU_CAP_MIN, cap - 3)} className="input !w-28" />
          </label>
          <label className="block">
            <span className="label">Cấp tối đa</span>
            <input name="max" type="number" min={DAU_CAP_MIN} max={DAU_CAP_MAX}
              defaultValue={Math.min(DAU_CAP_MAX, cap + 3)} className="input !w-28" />
          </label>
          <button type="submit" disabled={dangTao || !con} className="btn-primary !py-1.5 text-sm disabled:opacity-60">
            Mở kèo
          </button>
        </div>
      </form>

      <div>
        <p className="label mb-2">Kèo đang mở</p>
        {keo.length === 0 ? (
          <p className="text-sm text-ink-500">Chưa ai mở kèo. Mở một cái đi, có người sẽ vào.</p>
        ) : (
          <div className="space-y-2">
            {keo.map((k) => {
              const vua = cap >= k.capMin && cap <= k.capMax;
              return (
                <form key={k.id} action={vaoAction}
                  className="flex items-center gap-3 rounded-xl border-2 border-ink-200 p-3 dark:border-ink-700">
                  <input type="hidden" name="dau" value={k.id} />
                  <AnhThu nguon={k.nguon} nac={k.nac} className="h-11 w-11 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-sm">{k.nguoi}</b>
                      <span className="text-xs text-ink-400">cấp {k.cap}</span>
                      <span className="text-xs tabular-nums text-ink-400">{k.diem} điểm</span>
                      <HuyHieuHe he={k.he} />
                    </div>
                    <p className="text-xs text-ink-400">
                      Nhận cấp {k.capMin}–{k.capMax} · còn <DemNguoc den={k.hanLuc} />
                    </p>
                  </div>
                  <button type="submit" disabled={dangVao || !vua || !con}
                    className="btn-outline shrink-0 gap-1.5 !py-1.5 text-sm disabled:opacity-50"
                    title={vua ? undefined : 'Cấp của bạn không nằm trong khoảng kèo nhận'}>
                    <Swords size={14} /> Nhận
                  </button>
                </form>
              );
            })}
          </div>
        )}
      </div>

      {/* Những dòng đã kết thúc vốn nằm chết trong bảng, không màn nào đọc ra —
          nên đánh xong là mất dấu, chỉ còn một con số "thắng N trận". */}
      {xong.length > 0 && (
        <div>
          <p className="label mb-2 flex items-center gap-1.5"><History size={13} /> Trận gần đây</p>
          <ul className="space-y-1.5">
            {xong.map((t) => (
              <li key={t.id}
                className="flex flex-wrap items-center gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm dark:bg-ink-800/50">
                <b className={cn(
                  'text-xs font-bold',
                  t.hoa ? 'text-ink-400' : t.thang ? 'text-emerald-600' : 'text-rose-600',
                )}>
                  {t.hoa ? 'HOÀ' : t.thang ? 'THẮNG' : 'THUA'}
                </b>
                <span className="min-w-0 flex-1 truncate">{t.doiThu}</span>
                <span className="shrink-0 text-xs text-ink-400">
                  {new Date(t.luc).toLocaleString('vi', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {bang.length > 0 && (
        <div>
          <p className="label mb-2 flex items-center gap-1.5"><Crown size={13} /> Bảng điểm mùa này</p>
          <ol className="space-y-1.5">
            {bang.map((h, i) => (
              <li key={h.id} className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                h.laToi ? 'bg-brand-50 font-bold dark:bg-brand-950/40' : 'bg-ink-50 dark:bg-ink-800/50',
              )}>
                <span className="w-5 shrink-0 text-xs tabular-nums text-ink-400">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{h.ten}</span>
                <span className="shrink-0 text-xs text-ink-400">{h.thang} thắng</span>
                <b className="shrink-0 tabular-nums">{h.diem}</b>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Màn đấu ───────────────────────────

function ManDau({ tran }: { tran: Tran }) {
  const [danh, danhAction, dangDanh] = useActionState<PokeState, FormData>(danhDau, {});
  const [huy, huyAction, dangHuy] = useActionState<PokeState, FormData>(huyKeo, {});
  const router = useRouter();

  const toi = tran.laChu ? tran.chu : tran.doi!;
  const dich = tran.laChu ? tran.doi : tran.chu;
  const luotToi = tran.luotCua === (tran.laChu ? 'chu' : 'doi');

  // ── Chưa ai nhận kèo ────────────────────────────────────────────────
  if (!tran.coDoi) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Kèo của bạn đang treo cho cấp {tran.capMin}–{tran.capMax}. Hết giờ mà không ai
          nhận thì kèo tự huỷ, không mất gì.
        </p>
        <div className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-800/50">
          <AnhThu nguon={tran.chu.nguon} nac={tran.chu.nac} className="h-12 w-12" />
          <div className="min-w-0 flex-1">
            <b className="text-sm">{tran.chu.ten}</b>
            <p className="text-xs text-ink-400">Còn <DemNguoc den={tran.hanLuc} khiHet={() => router.refresh()} /></p>
          </div>
        </div>
        {huy.error && <p className="text-sm text-red-600">{huy.error}</p>}
        <div className="flex gap-2">
          <button onClick={() => router.refresh()} className="btn-outline !py-1.5 text-sm">Xem có ai vào chưa</button>
          <form action={huyAction}>
            <input type="hidden" name="dau" value={tran.id} />
            <button disabled={dangHuy} className="btn !py-1.5 text-sm">Huỷ kèo</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <BenSan ben={toi} nhan="Bạn" lat />
        <span className="text-center text-xs font-black text-ink-300">VS</span>
        <BenSan ben={dich!} nhan="Đối thủ" />
      </div>

      <p className="text-center text-sm">
        {luotToi
          ? <b className="text-emerald-600">Tới lượt bạn — còn <DemNguoc den={tran.hanLuc} khiHet={() => router.refresh()} /></b>
          : <span className="text-ink-500">Đang chờ đối thủ — còn <DemNguoc den={tran.hanLuc} khiHet={() => router.refresh()} /></span>}
      </p>

      {(danh.ke ?? tran.ke) && !danh.error && (
        <p className="man-hien rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800/50">{danh.ke ?? tran.ke}</p>
      )}
      {danh.error && <p className="text-sm text-red-600">{danh.error}</p>}

      {luotToi ? (
        <form action={danhAction}>
          <p className="label mb-2">Ra chiêu</p>
          {/* CHỈ hiện chỉ số chiêu của mình. Bày luôn chỉ số đối thủ thì biết
              ngay chiêu nào ăn, mà phần đoán xem đối thủ yếu ở chiêu nào —
              điểm hay duy nhất của luật đấu trường — chết hẳn. Đánh một lượt
              là câu kể nói mất bao nhiêu máu, tự suy ra được. */}
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <button key={i} type="submit" name="chieu" value={i + 1} disabled={dangDanh}
                className="rounded-xl border-2 border-ink-200 p-2.5 text-left transition-colors hover:border-brand-400 disabled:opacity-60 dark:border-ink-700">
                <span className="block truncate text-sm font-bold">
                  {toi.tenChieu[i] || `Chiêu ${i + 1}`}
                </span>
                <span className="text-[11px] text-ink-400">
                  chiêu {toi.chieu[i]} — trừ đi chiêu cùng số của đối thủ
                </span>
              </button>
            ))}
          </div>
        </form>
      ) : (
        <button onClick={() => router.refresh()} className="btn-outline w-full justify-center !py-2 text-sm">
          Xem đối thủ đánh chưa
        </button>
      )}
    </div>
  );
}

function BenSan({ ben, nhan, lat }: { ben: Ben; nhan: string; lat?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border-2 border-ink-100 p-3 text-center dark:border-ink-800">
      <span className="retro-sub text-ink-400">{nhan}</span>
      <AnhThu nguon={ben.nguon} nac={ben.nac} lat={lat} className="mx-auto h-16 w-auto" />
      <b className="mt-1 block truncate text-sm">{ben.ten}</b>
      <span className="block truncate text-[11px] text-ink-400">{ben.nguoi}</span>
      <span className="mt-0.5 flex justify-center"><HuyHieuHe he={ben.he} /></span>
      <div className="mt-1.5"><ThanhMau mau={ben.mau} toiDa={ben.mauToiDa} /></div>
      <span className="text-[11px] tabular-nums text-ink-500">{ben.mau}/{ben.mauToiDa}</span>
    </div>
  );
}
