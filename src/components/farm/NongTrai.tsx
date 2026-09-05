'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  bonPhan, giaoDon, gieoHat, haiCayKhe, moODat, muaHat, muaPhan, thuHoach,
  tuoiNuoc, xoiDat, type FarmState,
} from '@/app/(site)/nong-trai/actions';
import type { NongTrai as DuLieu } from '@/lib/farm';
import {
  O_DAT_TOI_DA, changCua, laBanNgay, moTaConLai, tienDoVu, tinhTrangViec,
  type ViecVu,
} from '@/lib/farm-const';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/Modal';
import { BangDon } from './BangDon';
import { BxhNongTrai } from './BxhNongTrai';
import { CuaHangHat } from './CuaHangHat';
import { ViecTrenO } from './ViecTrenO';
import { TuiHat } from './TuiHat';
import { TuiPhan } from './TuiPhan';
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
 * Bố cục xếp theo thứ tự người chơi nhìn: mảnh ruộng trước (việc của một ô
 * hiện ngay trên đầu ô ấy, dưới chân ruộng chỉ còn một dòng thuật lại ô đang
 * chọn), rồi mới tới cửa hàng, góc trại và nhà kho. Số điểm KHÔNG in ở đâu trong trang — nó đã nằm trên thanh đầu
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
  const [moCho, setMoCho] = useState(false);
  const [moKho, setMoKho] = useState(false);
  const [moTui, setMoTui] = useState(false);
  const [moBxh, setMoBxh] = useState(false);
  const [moPhan, setMoPhan] = useState(false);
  const [moDon, setMoDon] = useState(false);

  // Nhãn ngày/đêm đi theo ĐỒNG HỒ ĐANG CHẠY như cảnh ruộng, không theo cái cờ
  // máy chủ gửi lúc dựng trang — hai chỗ lệch nhau thì nhãn nói "Ban ngày"
  // trong lúc trời trong cảnh đã tối hẳn.
  const banNgay = laBanNgay(new Date(now));

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

  const duTienMoO = d.giaMoO != null && d.diem >= d.giaMoO;
  const moODatNgay = () => lam(moODat, {});

  /*
   * Lật trang thì bỏ luôn ô đang chọn: bảng việc bám vào ô, mà ô ấy nay đã ở
   * trang khác — để nguyên thì bảng biến mất còn dòng thuật dưới chân ruộng
   * vẫn mời làm việc lên một ô người chơi không còn nhìn thấy.
   */
  const doiTrang = (t: number) => { setTrang(t); setOChon(null); };

  /*
   * Một chỗ duy nhất nối tên việc với hàm chạy nó.
   *
   * "Gieo hạt" là việc DUY NHẤT không gọi thẳng server action mà mở hộp thoại
   * túi hạt trước — bốn việc kia không phải chọn gì cả, còn gieo thì phải biết
   * gieo hạt nào.
   */
  const lamViec = (v: ViecVu, oIndex: number) => {
    // Hai việc phải CHỌN MÓN trước nên mở hộp thoại chứ không gọi thẳng: gieo
    // thì phải biết gieo hạt nào, bón thì phải biết bón loại phân nào. Ba việc
    // còn lại không có gì để chọn.
    if (v === 'gieo') { setMoTui(true); return; }
    if (v === 'bon') { setMoPhan(true); return; }
    const viec = { xoi: xoiDat, tuoi: tuoiNuoc, thu: thuHoach }[v];
    lam(viec, { o: oIndex });
  };

  return (
    <div className="space-y-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          {d.soODaMo}/{O_DAT_TOI_DA} ô đất
        </span>
        <span className={cn(
          'chip',
          banNgay
            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
        )}>
          {banNgay ? 'Ban ngày' : 'Ban đêm'}
        </span>
        {soODaChin > 0 && (
          <span className="chip bg-emerald-500 text-white">{soODaChin} ô đã chín</span>
        )}
      </div>

      {/*
        ── Mảnh ruộng và dòng thuật việc, chung một khối ──

        Năm cái nút việc nay nổi ngay trên ô đất vừa bấm (`ViecTrenO`), nên chỗ
        này chỉ còn kể lại ô đang chọn đang ra sao: bấm ở đâu thì nút mọc ở đó,
        mắt không phải chạy xuống cuối khung ruộng rồi ngược lên.
      */}
      <div className="card overflow-hidden">
        <ManhDat
          oDat={d.oDat} now={now}
          dangChon={oChon} onChon={(i) => setOChon((cu) => (cu === i ? null : i))}
          giaMoO={d.giaMoO} duTienMoO={duTienMoO} dangLam={dangLam} onMua={moODatNgay}
          trang={trang} onTrang={doiTrang}
          onMoCuaHang={() => setMoCho(true)}
          onMoNhaKho={() => setMoKho(true)}
          onMoBxh={() => setMoBxh(true)}
          onMoBangDon={() => setMoDon(true)}
          kheSanSang={now >= d.kheSanSangLuc}
          onHaiKhe={() => lam(haiCayKhe, {})}
          bangViec={(oNay) => (
            <ViecTrenO
              tinhTrang={tinhTrangViec(
                oNay, changCua(oNay.plantedAt, oNay.readyAt, now) === 'chin',
              )}
              cropKey={oNay.cropKey}
              dangLam={dangLam}
              onViec={(v) => lamViec(v, oNay.index)}
            />
          )}
        />
        <ThanhViec
          nhan={
            !o ? 'Bấm vào một ô đất để xem việc của ô đó.'
              : o.cropKey == null
                ? o.tilled
                  ? `Ô ${o.index + 1} đã xới, gieo hạt được rồi.`
                  : `Ô ${o.index + 1} còn chai — xới đất trước đã.`
              : changO === 'chin' ? `${o.cropName} ở ô ${o.index + 1} đã chín, hái vào kho thôi.`
              : `${o.cropName} ở ô ${o.index + 1} · còn ${moTaConLai((o.readyAt ?? 0) - now)}`
          }
          phan={o && o.cropKey != null && changO !== 'chin'
            ? Math.round(tienDoVu(o.plantedAt, o.readyAt, now) * 100)
            : null}
        />
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

      {/*
        Cửa hàng nay chỉ để MUA hạt về túi, và nó nằm sau căn nhà trong cảnh.
        Mua xong hộp thoại vẫn mở để mua tiếp giống khác; đóng lúc nào là việc
        của người chơi. Gieo thì làm ở thanh việc dưới ruộng, nơi còn nhìn
        thấy ô đất — hộp thoại che kín ruộng nên không thể vừa mở vừa gieo.
      */}
      {/* `!max-w-2xl` chứ không phải `max-w-2xl`: `cn` ở đây chỉ nối chuỗi chứ
          không gộp lớp Tailwind, nên `max-w-md` sẵn có trong `Modal` vẫn đứng
          nguyên và thắng theo thứ tự trong bảng kiểu. */}
      <Modal open={moCho} onClose={() => setMoCho(false)} title="Cửa hàng hạt giống"
        className="!max-w-2xl">
        <CuaHangHat
          cay={cay} diem={d.diem} dangLam={dangLam}
          daCo={Object.fromEntries(d.tuiHat.map((h) => [h.cropId, h.qty]))}
          phanDangCo={Object.fromEntries(d.phanBon.map((f) => [f.kind, f.qty]))}
          onMua={(cayId, soLuong) => lam(muaHat, { cay: cayId, so_luong: soLuong })}
          onMuaPhan={(kind, soLuong) => lam(muaPhan, { loai: kind, so_luong: soLuong })}
        />
      </Modal>

      <Modal open={moKho} onClose={() => setMoKho(false)} title="Nhà kho"
        className="!max-w-lg">
        <NhaKho kho={d.kho} tuiHat={d.tuiHat} phanBon={d.phanBon} />
      </Modal>

      {/*
        Túi hạt mở ra từ nút "Gieo hạt", và ĐÓNG NGAY khi chọn xong: khác với
        cửa hàng (mua một lúc mấy giống là chuyện thường), một ô đất chỉ nhận
        đúng một hạt — chọn xong là hết việc ở đây, giữ hộp thoại lại chỉ tổ
        che mất cái cây vừa mọc.
      */}
      <Modal open={moTui} onClose={() => setMoTui(false)} title="Chọn hạt để gieo">
        <TuiHat
          tui={d.tuiHat} dangLam={dangLam}
          onGieo={(cayId) => {
            if (oChon == null) return;
            setMoTui(false);
            lam(gieoHat, { o: oChon, cay: cayId });
          }}
          onToiCuaHang={() => { setMoTui(false); setMoCho(true); }}
        />
      </Modal>

      <Modal open={moPhan} onClose={() => setMoPhan(false)} title="Chọn phân để bón">
        <TuiPhan
          phan={d.phanBon} dangLam={dangLam}
          onBon={(kind) => {
            if (oChon == null) return;
            setMoPhan(false);
            lam(bonPhan, { o: oChon, loai: kind });
          }}
          onToiCuaHang={() => { setMoPhan(false); setMoCho(true); }}
        />
      </Modal>

      <Modal open={moDon} onClose={() => setMoDon(false)} title="Bảng đơn hàng"
        className="!max-w-2xl">
        <BangDon
          don={d.donHang} now={now} dangLam={dangLam}
          onGiao={(donId) => lam(giaoDon, { don: donId })}
        />
      </Modal>

      <Modal open={moBxh} onClose={() => setMoBxh(false)} title="Bảng xếp hạng nông trại"
        className="!max-w-lg">
        <BxhNongTrai bxh={d.bxh} toi={d.toi} />
      </Modal>
    </div>
  );
}

/**
 * Dòng thuật việc dính ngay dưới chân ruộng.
 *
 * Chỉ còn CHỮ và vạch tiến độ: mấy cái nút đã dọn lên bảng nổi trên chính ô
 * đất. Dòng này ở lại vì nó nói được thứ bảng nút không nói nổi trong bốn tấm
 * ảnh bé — cây gì, ở ô số mấy, còn bao lâu nữa thì chín.
 */
function ThanhViec({ nhan, phan }: {
  nhan: string;
  /** Phần trăm vụ đã đi, `null` khi ô không có gì đang lớn. */
  phan: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--nova-border)] px-3 py-2.5">
      <div className="min-w-0 flex-1 basis-full">
        <p className="text-sm font-semibold">{nhan}</p>
        {phan != null && (
          <span className="mt-1 block h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 transition-[width] duration-1000 ease-linear"
              style={{ width: `${phan}%` }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
