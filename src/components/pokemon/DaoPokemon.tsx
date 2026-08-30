'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Loader2, Lock, Search } from 'lucide-react';
import {
  boChay, doiKhu, nemCau, raChieu, timThu, uongThuoc, type PokeState,
} from '@/app/(site)/pokemon/actions';
import { CO_HOI_BAT, boThu, expChoCap, heSoHe, tenHe, tinhSatThuong } from '@/lib/pokemon-const';
import { bienCanh, canhKhu } from '@/lib/pokemon-giao-dien';
import { cn } from '@/lib/utils';
import { HuyHieuHe, OTaiNguyen, ThanhMau, TrenBe } from './ThePoke';

interface Thu {
  id: string; ten: string; nguon: number; nac: number; he: number;
  cap: number; exp: number; mau: number; mauToiDa: number;
  chieu: string[]; c: number[];
}
interface Tran {
  ten: string; nguon: number; nac: number; he: number;
  mau: number; mauToiDa: number; cong: number; thu: number;
  exp: number; vang: number; ke: string | null; gym: number | null;
}
interface NV {
  ten: string; vang: number; exp: number; cap: number;
  sk: number; skToiDa: number; cau: number; da: number; khu: string;
  ngoc: number; huyChuong: number;
}
interface Khu { ma: string; ten: string; bac: number; mo: string }
export interface Thuoc { id: string; ten: string; mau: number; sl: number }

export function DaoPokemon({ nv, raTran, tran, khuHienTai, soTrongKhu, khuMo, thuoc, boTrangBi }: {
  nv: NV; raTran: Thu | null | undefined; tran: Tran | null;
  khuHienTai: Khu; soTrongKhu: number; khuMo: (Khu & { chan: string | null })[];
  thuoc: Thuoc[]; boTrangBi: { cong: number; thu: number };
}) {
  return (
    <div style={bienCanh(nv.khu)} className="space-y-4">
      <BangNhanVat nv={nv} raTran={raTran} />
      {tran && raTran
        ? <ManDanh tran={tran} toi={raTran} coCau={nv.cau} khu={khuHienTai} thuoc={thuoc} boTrangBi={boTrangBi} />
        : <ManDi khu={khuHienTai} soTrongKhu={soTrongKhu} khuMo={khuMo} nv={nv} />}
    </div>
  );
}

// ─────────────────────────── Bảng nhân vật ───────────────────────────

/**
 * Thẻ nhân vật. Năm con số tài nguyên trước đây là năm cặp "nhãn chữ + số"
 * xếp hàng ngang, đọc chậm và tràn dòng trên điện thoại; nay mỗi thứ là ảnh
 * gốc của bản wap (`img/icon/vang.png`…) nên nhận ra bằng mắt, không phải đọc.
 */
function BangNhanVat({ nv, raTran }: { nv: NV; raTran: Thu | null | undefined }) {
  const canCap = expChoCap(nv.cap + 1);
  const tiCap = canCap > 0 ? Math.min(1, nv.exp / canCap) : 0;

  return (
    <section className="dao-tam overflow-hidden">
      <div className="dao-nen-nhan flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
        <b className="text-base">{nv.ten}</b>
        <span className="chip dao-vien border bg-white/60 !py-0 text-[11px] dark:bg-black/20">
          Cấp {nv.cap}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
          <OTaiNguyen anh="vang.png" nhan="Vàng" giaTri={nv.vang} mau="text-amber-600 dark:text-amber-400" />
          <OTaiNguyen anh="ngoc.png" nhan="Ngọc" giaTri={nv.ngoc} mau="text-emerald-600 dark:text-emerald-400" />
          <OTaiNguyen anh="quacau.gif" nhan="Quả cầu" giaTri={nv.cau} mau="text-rose-600 dark:text-rose-400" />
          <OTaiNguyen anh="da.png" nhan="Đá tiến cấp" giaTri={nv.da} mau="text-violet-600 dark:text-violet-400" />
        </span>
      </div>

      <div className="grid gap-2 px-4 py-3 sm:grid-cols-2">
        <ThanhDoc nhan="Thể lực" tri={`${nv.sk}/${nv.skToiDa}`}>
          <ThanhMau mau={nv.sk} toiDa={nv.skToiDa} nho />
        </ThanhDoc>
        <ThanhDoc nhan={`Cấp ${nv.cap + 1}`} tri={`${nv.exp.toLocaleString('vi')}/${canCap.toLocaleString('vi')}`}>
          <div className="dao-mau h-1.5 w-full">
            <i className="bg-sky-500" style={{ width: `${tiCap * 100}%` }} />
          </div>
        </ThanhDoc>
      </div>

      {raTran && (
        <div className="flex items-center gap-3 border-t px-4 py-3 dao-vien">
          <TrenBe nguon={raTran.nguon} nac={raTran.nac} className="h-14 w-16 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-sm">{raTran.ten}</b>
              <HuyHieuHe he={raTran.he} />
              <span className="text-xs opacity-60">Cấp {raTran.cap}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <ThanhMau mau={raTran.mau} toiDa={raTran.mauToiDa} nho />
              <span className="shrink-0 text-xs tabular-nums opacity-70">
                {raTran.mau}/{raTran.mauToiDa}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ThanhDoc({ nhan, tri, children }: { nhan: string; tri: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="opacity-60">{nhan}</span>
        <span className="tabular-nums opacity-80">{tri}</span>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────── Màn đi tìm thú ───────────────────────────

function ManDi({ khu, soTrongKhu, khuMo, nv }: {
  khu: Khu; soTrongKhu: number; khuMo: (Khu & { chan: string | null })[]; nv: NV;
}) {
  const [tim, timAction, dangTim] = useActionState<PokeState, FormData>(timThu, {});
  const [doi, doiAction, dangDoi] = useActionState<PokeState, FormData>(doiKhu, {});

  return (
    <>
      {/* Khung cảnh khu đang đứng: đây là chỗ duy nhất trên trang cho người
          chơi biết mình đang ở đâu, nên để nó chiếm chỗ và có màu riêng. */}
      <section className="dao-canh relative overflow-hidden rounded-2xl">
        <div className="relative z-[1] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-lg drop-shadow-sm">{khu.ten}</b>
            <span className="chip border border-black/15 bg-white/25 !py-0 text-[11px] dark:border-white/20 dark:bg-black/25">
              Bậc {khu.bac}
            </span>
            <span className="text-xs opacity-75">{soTrongKhu} loài</span>
          </div>
          <p className="mt-1 max-w-md text-sm opacity-85">{khu.mo}</p>

          <form action={timAction} className="mt-4">
            <button type="submit" disabled={dangTim || nv.sk < 2}
              className="dao-nut inline-flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-sm sm:w-56">
              {dangTim ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {dangTim ? 'Đang lùng…' : 'Tìm thú'}
            </button>
          </form>
          {nv.sk < 2 && (
            <p className="mt-2 text-sm font-semibold">Hết thể lực rồi — vào trạm y tế nghỉ đã.</p>
          )}
          {tim.error && <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">{tim.error}</p>}
          {tim.ke && !tim.error && <p className="man-hien mt-2 text-sm opacity-90">{tim.ke}</p>}
        </div>
      </section>

      <section className="dao-tam p-5">
        <h2 className="zib-title mb-3">{khuMo.length} khu trên đảo</h2>
        {doi.error && <p className="mb-2 text-sm text-red-600">{doi.error}</p>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {khuMo.map((k) => (
            <TheKhu key={k.ma} k={k} dangO={k.ma === khu.ma} doiAction={doiAction} dangDoi={dangDoi} />
          ))}
        </div>
      </section>
    </>
  );
}

/**
 * Một khu trên bản đồ. Trước đây mười lăm khu là mười lăm khung chữ trắng như
 * nhau; nay mỗi cái mang đúng dải màu của khu ấy nên bản đồ đọc được bằng màu,
 * và khu chưa mở thì xám hẳn kèm ổ khoá chứ không chỉ mờ đi.
 */
function TheKhu({ k, dangO, doiAction, dangDoi }: {
  k: Khu & { chan: string | null }; dangO: boolean;
  doiAction: (fd: FormData) => void; dangDoi: boolean;
}) {
  const khoa = k.chan !== null;
  const c = canhKhu(k.ma);
  return (
    <form action={doiAction}>
      <input type="hidden" name="khu" value={k.ma} />
      <button type="submit" disabled={dangO || khoa || dangDoi}
        style={bienCanh(k.ma)}
        className={cn(
          'relative w-full overflow-hidden rounded-xl border-2 p-2.5 text-left transition-all',
          dangO ? 'dao-vien ring-2 ring-[var(--dao-nhan)]/40'
            : khoa ? 'cursor-not-allowed border-ink-200 dark:border-ink-700'
              : 'border-transparent hover:-translate-y-0.5 hover:shadow-lg',
        )}>
        <span aria-hidden className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${c.xa}, ${c.gan})`,
            opacity: dangO ? 0.5 : khoa ? 0.16 : 0.32,
            filter: khoa ? 'grayscale(0.75)' : undefined,
          }} />
        {/* Tên khu KHÔNG cắt ngắn: "Hang Huy…" và "Vực R…" thì bản đồ mất hẳn
            tác dụng. Số bậc tách xuống dòng phụ để tên được trọn chiều ngang. */}
        <span className={cn('relative flex items-start gap-1.5', khoa && 'opacity-55')}>
          {khoa && <Lock size={12} className="mt-0.5 shrink-0" />}
          <b className="text-[13px] leading-tight">{k.ten}</b>
        </span>
        <span className={cn('relative mt-0.5 block text-[11px] leading-snug opacity-70', khoa && 'opacity-55')}>
          <span className="chip mr-1 bg-black/10 !py-0 text-[10px] dark:bg-white/10">Bậc {k.bac}</span>
          {khoa ? k.chan : dangO ? 'đang ở đây' : k.mo}
        </span>
      </button>
    </form>
  );
}

// ─────────────────────────── Màn đánh nhau ───────────────────────────

function ManDanh({ tran, toi, coCau, khu, thuoc, boTrangBi }: {
  tran: Tran; toi: Thu; coCau: number; khu: Khu; thuoc: Thuoc[];
  boTrangBi: { cong: number; thu: number };
}) {
  const [danh, danhAction, dangDanh] = useActionState<PokeState, FormData>(raChieu, {});
  const [bat, batAction, dangBat] = useActionState<PokeState, FormData>(nemCau, {});
  const [chay, chayAction, dangChay] = useActionState<PokeState, FormData>(boChay, {});
  const [uong, uongAction, dangUong] = useActionState<PokeState, FormData>(uongThuoc, {});
  const ban = dangDanh || dangBat || dangChay || dangUong;
  const luot = useNhipDon(dangDanh);

  // Xem trước hệ số hệ: chính là thứ quyết định nên ra chiêu hay nên bỏ chạy,
  // mà bản gốc chẳng nói gì cả — người chơi phải tự đoán qua từng trận.
  const [nGay, nChiu] = heSoHe(toi.he, tran.he);
  // Cộng cả trang bị đang mặc vào bản xem trước. Máy chủ vẫn cộng ở `raChieu`;
  // trước đây chỗ này quên nên mặc Ma Kiếm +500 mà nút vẫn báo con số như lúc
  // tay không — người chơi tưởng trang bị vô dụng.
  const boThuToi = boThu({ c1: toi.c[0]!, c2: toi.c[1]!, c3: toi.c[2]!, c4: toi.c[3]! }) + boTrangBi.thu;
  const loi = danh.error ?? bat.error ?? chay.error ?? uong.error;

  return (
    <section className="dao-tam overflow-hidden">
      {/* Sân đấu: hai con đứng chéo nhau trên nền cảnh của khu, thay cho hai ô
          vuông cạnh nhau — trận đánh giờ nhìn ra là một trận đánh. */}
      <div className="dao-canh relative h-52 overflow-hidden sm:h-60">
        <div className="absolute left-3 top-3 z-[2] w-[52%] max-w-[15rem]">
          <TheDau ten={tran.ten} he={tran.he} mau={tran.mau} toiDa={tran.mauToiDa} />
        </div>
        <TrenBe key={`dich-${luot}`} nguon={tran.nguon} nac={tran.nac}
          hieuUng={luot > 0 ? 'dao-dinh' : 'dao-ra-san'}
          className="absolute right-[6%] top-[8%] z-[1] h-20 w-24 sm:h-24 sm:w-28" />

        <TrenBe key={`toi-${luot}`} nguon={toi.nguon} nac={toi.nac} lat
          hieuUng={luot > 0 ? 'dao-lao' : undefined}
          className="absolute bottom-[8%] left-[6%] z-[1] h-20 w-24 sm:h-24 sm:w-28" />
        <div className="absolute bottom-3 right-3 z-[2] w-[52%] max-w-[15rem]">
          <TheDau ten={toi.ten} he={toi.he} mau={toi.mau} toiDa={toi.mauToiDa} cap={toi.cap} />
        </div>

      </div>

      <div className="p-4">
        <p className="text-center text-xs opacity-70">
          {khu.ten} · {tenHe(toi.he)} đánh {tenHe(tran.he)}:{' '}
          <b className={cn(nGay > 1 ? 'text-emerald-600' : nGay < 1 ? 'text-rose-600' : '')}>
            {nGay === 0 ? 'vô hiệu' : `sát thương ×${nGay}`}
          </b>
          {' · '}
          <b className={cn(nChiu > 1 ? 'text-rose-600' : nChiu < 1 ? 'text-emerald-600' : '')}>
            chịu ×{nChiu}
          </b>
        </p>

        {(danh.ke ?? tran.ke) && !danh.error && (
          <p className="man-hien mt-3 rounded-xl bg-ink-100/70 p-3 text-sm dark:bg-ink-800/60">
            {danh.ke ?? tran.ke}
          </p>
        )}
        {bat.ke && !bat.error && (
          <p className="man-hien mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {bat.ke}
          </p>
        )}
        {uong.ke && !uong.error && (
          <p className="man-hien mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {uong.ke}
          </p>
        )}
        {loi && <p className="mt-3 text-sm text-red-600">{loi}</p>}

        <form action={danhAction} className="mt-4">
          <p className="label mb-2">Ra chiêu</p>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => {
              const { gay } = tinhSatThuong(
                toi.c[i]! + boTrangBi.cong, boThuToi, toi.he, tran.cong, tran.thu, tran.he);
              return (
                <button key={i} type="submit" name="chieu" value={i + 1} disabled={ban}
                  className="dao-vien rounded-xl border-2 p-2.5 text-left transition-colors hover:bg-black/5 disabled:opacity-60 dark:hover:bg-white/5">
                  <span className="block truncate text-sm font-bold">
                    {toi.chieu[i] || `Chiêu ${i + 1}`}
                  </span>
                  <span className="text-[11px] opacity-60">gây khoảng {gay.toLocaleString('vi')} máu</span>
                </button>
              );
            })}
          </div>
        </form>

        {/* Thuốc dùng ngay trong trận — bản gốc bắt bỏ chạy, chạy về trạm y tế
            rồi quay lại tìm con khác, nên cái túi thuốc coi như vô dụng lúc
            đang cần nhất. */}
        {thuoc.length > 0 && (
          <form action={uongAction} className="mt-3">
            <p className="label mb-2">Dùng thuốc</p>
            <div className="flex flex-wrap gap-2">
              {thuoc.map((t) => (
                <button key={t.id} type="submit" name="do" value={t.id} disabled={ban || toi.mau >= toi.mauToiDa}
                  className="btn-outline gap-1.5 !py-1.5 text-xs disabled:opacity-50">
                  {t.ten} +{t.mau.toLocaleString('vi')} ×{t.sl}
                </button>
              ))}
            </div>
          </form>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Chủ Gym không bắt được, nên đừng bày cái nút ra rồi báo lỗi. */}
          {!tran.gym && (
            <form action={batAction}>
              <button type="submit" disabled={ban || coCau < 1}
                className="dao-nut inline-flex items-center gap-1.5 px-3.5 py-1.5 text-sm">
                {dangBat && <Loader2 size={14} className="animate-spin" />}
                Ném cầu ({coCau})
              </button>
            </form>
          )}
          <form action={chayAction}>
            <button type="submit" disabled={ban} className="btn-outline !py-1.5 text-sm">Bỏ chạy</button>
          </form>
          <span className="ml-auto text-xs opacity-60">
            {tran.gym ? 'Trận Gym — không bắt được' : `Bắt trúng khoảng ${Math.round(CO_HOI_BAT * 100)}%`}
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * Đếm số lượt đã đánh, chỉ để làm mốc chạy lại hiệu ứng.
 *
 * Đếm theo lúc lượt gửi đi VỪA XONG, không theo nội dung dòng kể: hai lượt ra
 * đúng một câu như nhau — đánh trúng hai lần cùng số máu — thì so chuỗi sẽ
 * thấy y nguyên và hiệu ứng đứng im, dù người chơi vừa bấm thật.
 */
function useNhipDon(dangGui: boolean): number {
  const [luot, setLuot] = useState(0);
  const truoc = useRef(false);
  useEffect(() => {
    if (truoc.current && !dangGui) setLuot((n) => n + 1);
    truoc.current = dangGui;
  }, [dangGui]);
  return luot;
}

/** Thẻ tên + máu treo cạnh mỗi bên, kiểu bảng trạng thái của game đối kháng. */
function TheDau({ ten, he, mau, toiDa, cap }: {
  ten: string; he: number; mau: number; toiDa: number; cap?: number;
}) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/80 px-2.5 py-1.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-black/50">
      <div className="flex items-center gap-1.5">
        <b className="min-w-0 flex-1 truncate text-xs">{ten}</b>
        {cap !== undefined && <span className="text-[10px] opacity-60">Cp{cap}</span>}
        <HuyHieuHe he={he} className="h-3" />
      </div>
      <div className="mt-1"><ThanhMau mau={mau} toiDa={toiDa} nho /></div>
      <span className="text-[10px] tabular-nums opacity-70">
        {mau.toLocaleString('vi')}/{toiDa.toLocaleString('vi')}
      </span>
    </div>
  );
}
