'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  banNongSan, gieoHat, haiCayKhe, moODat, thuHoach, tuoiNuoc, type FarmState,
} from '@/app/(site)/nong-trai/actions';
import type { NongTrai as DuLieu } from '@/lib/farm';
import {
  O_DAT_TOI_DA, TUOI_RUT_NGAN, changCua, moTaConLai, tienDoVu,
} from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { CuaHangHat } from './CuaHangHat';
import { GocTrai } from './GocTrai';
import { ManhDat } from './ManhDat';
import { NhaKho } from './NhaKho';

/**
 * Nông trại — một màn hình, mọi việc làm ngay tại chỗ.
 *
 * Toàn bộ thao tác đi qua `useTransition` gọi thẳng server action, chứ không
 * bọc mỗi việc trong một `<form>` riêng: sáu việc mà sáu form thì trang đầy
 * thẻ ẩn, còn ở đây việc nào cũng chỉ là "ô nào, cây nào, bao nhiêu".
 *
 * Đồng hồ lấy mốc từ máy chủ (`d.now`) rồi mới tự chạy tiếp: nếu lần dựng đầu
 * ở trình duyệt đã dùng `Date.now()` của máy người xem thì máy nào lệch giờ là
 * React kêu sai lệch dựng hình ngay giây đầu tiên.
 *
 * Bố cục xếp theo thứ tự người chơi nhìn: mảnh ruộng trước (kèm một thanh việc
 * dính ngay dưới chân ruộng, làm gì cũng ở đó), rồi mới tới cửa hàng, góc trại
 * và nhà kho. Số điểm KHÔNG in ở đâu trong trang — nó đã nằm trên thanh đầu
 * trang, in lại là có hai con số phải giữ cho khớp nhau.
 */

type ViecLam = (prev: FarmState, formData: FormData) => Promise<FarmState>;

export function NongTrai({ d }: { d: DuLieu }) {
  const router = useRouter();
  const [now, setNow] = useState(d.now);
  const [tin, setTin] = useState<FarmState>({});
  const [dangLam, batDau] = useTransition();
  const [oChon, setOChon] = useState<number | null>(null);
  const [trang, setTrang] = useState(0);

  // Đồng hồ nhích mỗi giây để đếm ngược chạy mà không phải hỏi lại máy chủ.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Ô vừa chín thì tải lại trang một lần cho nút "Thu hoạch" hiện ra đúng lúc.
  const soODaChin = d.oDat.filter((o) => changCua(o.plantedAt, o.readyAt, now) === 'chin').length;
  useEffect(() => {
    if (soODaChin > 0) router.refresh();
  }, [soODaChin, router]);

  const lam = (viec: ViecLam, truong: Record<string, string | number>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(truong)) fd.set(k, String(v));
    batDau(async () => {
      setTin(await viec({}, fd));
      router.refresh();
    });
  };

  const o = oChon == null ? null : d.oDat.find((x) => x.index === oChon) ?? null;
  const changO = o ? changCua(o.plantedAt, o.readyAt, now) : null;

  // Sắp cây theo giá hạt: nhìn từ trái sang là thấy ngay bậc thang rẻ → đắt.
  const cay = useMemo(
    () => [...d.cayGiong].sort((a, b) => a.seedCost - b.seedCost),
    [d.cayGiong],
  );

  /*
   * Hạt gieo xuống ô nào: ô đang chọn nếu nó còn trống, không thì ô trống đầu
   * tiên. Bắt người chơi chọn ô rồi mới cho bấm giống là thêm một bước thừa —
   * chín trên mười lần thì ô nào cũng như ô nào.
   */
  const oTrongDauTien = d.oDat.find((x) => x.cropKey == null)?.index ?? null;
  const oSeGieo = o && o.cropKey == null ? o.index : oTrongDauTien;

  const duTienMoO = d.giaMoO != null && d.diem >= d.giaMoO;
  const moODatNgay = () => lam(moODat, {});

  /*
   * Lật trang thì bỏ luôn ô đang chọn: thanh việc ở dưới nói về ô đang chọn,
   * mà ô ấy nay đã ở trang khác — để nguyên là thanh việc mời làm một việc
   * lên chính cái ô người chơi không còn nhìn thấy.
   */
  const doiTrang = (t: number) => { setTrang(t); setOChon(null); };

  return (
    <div className="space-y-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          {d.soODaMo}/{O_DAT_TOI_DA} ô đất
        </span>
        <span className={cn(
          'chip',
          d.banNgay
            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
        )}>
          {d.banNgay ? 'Ban ngày' : 'Ban đêm'}
        </span>
        {soODaChin > 0 && (
          <span className="chip bg-emerald-500 text-white">{soODaChin} ô đã chín</span>
        )}
      </div>

      {/* ── Mảnh ruộng và thanh việc, chung một khối ── */}
      <div className="card overflow-hidden">
        <ManhDat
          oDat={d.oDat} now={now} banNgay={d.banNgay}
          dangChon={oChon} onChon={(i) => setOChon((cu) => (cu === i ? null : i))}
          giaMoO={d.giaMoO} duTienMoO={duTienMoO} dangLam={dangLam} onMua={moODatNgay}
          trang={trang} onTrang={doiTrang}
        />
        <ThanhViec
          nhan={
            !o ? 'Bấm vào một ô đất để xem việc của ô đó.'
              : o.cropKey == null ? `Ô ${o.index + 1} đang trống — chọn giống ở Cửa hàng hạt giống bên dưới.`
              : changO === 'chin' ? `${o.cropName} ở ô ${o.index + 1} đã chín, hái vào kho thôi.`
              : `${o.cropName} ở ô ${o.index + 1} · còn ${moTaConLai((o.readyAt ?? 0) - now)}${o.watered ? ' · đã tưới' : ''}`
          }
          phan={o && o.cropKey != null && changO !== 'chin'
            ? Math.round(tienDoVu(o.plantedAt, o.readyAt, now) * 100)
            : null}
        >
          {o && o.cropKey != null && changO === 'chin' && (
            <button
              type="button" disabled={dangLam}
              onClick={() => lam(thuHoach, { o: o.index })}
              className="btn-primary !bg-emerald-500 !py-1.5 hover:!bg-emerald-600 disabled:opacity-50"
            >
              Thu hoạch
            </button>
          )}
          {o && o.cropKey != null && changO !== 'chin' && (
            <button
              type="button" disabled={dangLam || o.watered}
              onClick={() => lam(tuoiNuoc, { o: o.index })}
              className="btn-primary !py-1.5 disabled:opacity-50"
              title={`Tưới một lần mỗi vụ, chín sớm hơn ${Math.round(TUOI_RUT_NGAN * 100)}%`}
            >
              {o.watered ? 'Vụ này tưới rồi' : 'Tưới nước'}
            </button>
          )}
        </ThanhViec>
      </div>

      {(tin.ke || tin.error) && (
        <p
          role="status"
          className={cn(
            'rounded-xl px-3 py-2 text-sm font-medium',
            tin.error
              ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
          )}
        >
          {tin.error ?? tin.ke}
        </p>
      )}

      <CuaHangHat
        cay={cay} diem={d.diem} oSeGieo={oSeGieo} dangLam={dangLam}
        onGieo={(cayId) => {
          if (oSeGieo == null) return;
          setOChon(oSeGieo);
          lam(gieoHat, { o: oSeGieo, cay: cayId });
        }}
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <NhaKho
          kho={d.kho} dangLam={dangLam}
          onBan={(cropId, so) => lam(banNongSan, { cay: cropId, so_luong: so })}
        />
        <GocTrai
          kheSanSangLuc={d.kheSanSangLuc} now={now}
          giaMoO={d.giaMoO} soODaMo={d.soODaMo} duTienMoO={duTienMoO}
          dangLam={dangLam} onHaiKhe={() => lam(haiCayKhe, {})} onMuaDat={moODatNgay}
        />
      </div>
    </div>
  );
}

/**
 * Thanh việc dính ngay dưới chân ruộng.
 *
 * Một chỗ duy nhất cho mọi việc của ô đang chọn, nên mắt không phải chạy đi
 * tìm nút: bấm ô nào thì câu chữ và cái nút ở đây đổi theo ô ấy.
 */
function ThanhViec({
  nhan, phan, children,
}: {
  nhan: string;
  /** Phần trăm vụ đã đi, `null` khi ô không có gì đang lớn. */
  phan: number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--nova-border)] px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{nhan}</p>
        {phan != null && (
          <span className="mt-1 block h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 transition-[width] duration-1000 ease-linear"
              style={{ width: `${phan}%` }}
            />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
