'use client';

import { useActionState, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FileArchive, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import {
  luuGoiSticker, themSticker, xoaGoiSticker, xoaSticker, type KetQua,
} from '@/app/(quan-tri)/quan-tri/viec';
import { NutViec } from './NutViec';
import { napAnh } from './ONapAnh';
import { STICKER_MOI_GOI, TEN_GOI_TOI_DA, ZIP_TOI_DA } from '@/lib/cam-xuc-const';

export interface GoiQuanTri {
  id: string;
  ten: string;
  sticker: { id: string; anh: string }[];
}

/**
 * Quản lý gói sticker: mở gói, ném hình vào gói, gỡ hình, gỡ cả gói.
 *
 * TẢI NHIỀU TẤM MỘT LƯỢT, và đó là điểm khác hẳn mọi ô ảnh khác trong khu quản
 * trị. Một gói sticker là mấy chục hình được vẽ cùng một mẻ; bắt chọn từng tấm
 * rồi bấm lưu từng lần thì người ta bỏ cuộc ở tấm thứ năm.
 */
export function KhungSticker({ goi }: { goi: GoiQuanTri[] }) {
  const [ketQua, gui, dangChay] = useActionState<KetQua, FormData>(luuGoiSticker, {});

  return (
    <div className="space-y-4">
      {goi.map((g) => <MotGoi key={g.id} g={g} />)}

      <form action={gui} className="the flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-[200px] flex-1">
          <span className="phu mb-1 block">Tên gói mới</span>
          <input name="ten" required maxLength={TEN_GOI_TOI_DA} placeholder="Bộ mèo mập"
            className="o-nhap" />
        </label>
        <button type="submit" disabled={dangChay} className="nut-xam">
          {dangChay ? 'Đang mở…' : 'Mở gói mới'}
        </button>
        {ketQua.loi && (
          <p role="alert" className="basis-full rounded-nut bg-xau/10 px-3 py-2 text-[13px] font-medium text-xau">
            {ketQua.loi}
          </p>
        )}
      </form>
    </div>
  );
}

function MotGoi({ g }: { g: GoiQuanTri }) {
  const [dangNap, datDangNap] = useState(0);
  const [dangBung, datDangBung] = useState(false);
  const [loi, datLoi] = useState<string | null>(null);
  const [tin, datTin] = useState<string | null>(null);
  const [, batDau] = useTransition();
  const oRef = useRef<HTMLInputElement>(null);
  const oZip = useRef<HTMLInputElement>(null);
  const router = useRouter();

  /*
   * Ném cả tệp zip lên, máy chủ tự mở ra.
   *
   * Khác hẳn lối tải từng tấm ở trên: đây là MỘT lượt đi về cho cả gói, còn
   * chọn ba mươi tấm trong hộp chọn tệp là ba mươi lượt nối đuôi nhau. Bộ
   * sticker tải về ở đâu cũng là một tệp nén, nên đây mới là lối tự nhiên.
   *
   * Không dùng `napAnh` như bên kia: cổng ảnh nhận đúng một tấm, còn tệp này
   * đi tới cổng riêng, mở gói và ghi thẳng mấy hàng `Sticker` (xem route).
   */
  const nhanZip = async (tep: File | null | undefined) => {
    if (!tep) return;
    datLoi(null);
    datTin(null);
    if (tep.size > ZIP_TOI_DA) {
      datLoi(`Tệp zip nặng quá ${Math.round(ZIP_TOI_DA / 1024 / 1024)}MB.`);
      return;
    }

    datDangBung(true);
    const fd = new FormData();
    fd.set('goiId', g.id);
    fd.set('tep', tep);
    try {
      const r = await fetch('/api/tai-goi-sticker', { method: 'POST', body: fd });
      const kq = await r.json().catch(() => ({}));
      if (!r.ok) { datLoi(kq.loi ?? 'Không mở được tệp zip.'); return; }
      // Nói ra cả phần BỊ BỎ QUA: một gói tải về thường kèm readme và thư mục
      // rác, và người tải lên cần biết vì sao ba mươi tấm chỉ vào hai mươi tám.
      datTin(`Đã thêm ${kq.daThem} hình.`
        + (kq.boQua ? ` Bỏ qua ${kq.boQua} tệp không phải ảnh.` : '')
        + (kq.conLai ? ` Còn ${kq.conLai} tấm chưa lấy vì gói đã đầy.` : ''));
      router.refresh();
    } catch {
      datLoi('Mất mạng giữa chừng. Thử lại giúp mình nhé.');
    } finally {
      datDangBung(false);
      if (oZip.current) oZip.current.value = '';
    }
  };

  /*
   * Tải LẦN LƯỢT chứ không bắn cả mớ cùng lúc.
   *
   * Cổng ảnh có cửa chặn đếm lượt; bắn hai mươi tấm song song là tự mình đâm
   * vào chính cái cửa ấy, rồi một nửa số tấm hỏng mà chẳng hiểu vì sao. Lần
   * lượt thì chậm hơn vài giây và luôn đủ.
   */
  const nhanTep = async (ds: FileList | null) => {
    if (!ds || ds.length === 0) return;
    datLoi(null);
    const con = STICKER_MOI_GOI - g.sticker.length;
    const chon = [...ds].slice(0, Math.max(0, con));
    if (chon.length === 0) {
      datLoi(`Gói này đã đủ ${STICKER_MOI_GOI} hình.`);
      return;
    }

    for (let i = 0; i < chon.length; i++) {
      datDangNap(chon.length - i);
      const kq = await napAnh(chon[i], 'sticker');
      if (kq.loi) { datLoi(kq.loi); break; }
      const kq2 = await themSticker(g.id, kq.duongDan ?? '');
      if (kq2.loi) { datLoi(kq2.loi); break; }
    }
    datDangNap(0);
    if (oRef.current) oRef.current.value = '';
  };

  return (
    <section className="the p-4">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold">{g.ten}</h2>
        <span className="phu shrink-0">{g.sticker.length}/{STICKER_MOI_GOI} hình</span>
        <NutViec lam={() => xoaGoiSticker(g.id)} kieu="nguyHiem"
          nho={`Gỡ gói ${g.ten}`} nhan={<Trash2 size={15} />}
          xacNhan={g.sticker.length > 0
            ? `Gỡ gói “${g.ten}” cùng ${g.sticker.length} hình trong đó? Mấy câu chat đã gửi vẫn giữ nguyên hình của chúng.`
            : `Gỡ gói “${g.ten}”?`} />
      </div>

      {g.sticker.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {g.sticker.map((s) => (
            <li key={s.id} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.anh} alt="" className="size-16 rounded-nut border border-vien object-contain p-1" />
              <button type="button" aria-label="Gỡ hình này"
                onClick={() => batDau(async () => {
                  const kq = await xoaSticker(s.id);
                  if (kq.loi) datLoi(kq.loi);
                })}
                className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-xau-dac text-white opacity-0 transition-opacity focus:opacity-100 group-hover:opacity-100">
                <Trash2 size={11} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => oRef.current?.click()}
          disabled={dangNap > 0 || dangBung}
          className="nut-xam !min-h-[36px] !px-3 !text-[13px]">
          {dangNap > 0
            ? <><Loader2 size={14} className="animate-spin" aria-hidden /> Còn {dangNap} tấm…</>
            : <><ImagePlus size={14} aria-hidden /> Thêm hình vào gói</>}
        </button>
        <input ref={oRef} type="file" accept="image/*" multiple className="sr-only"
          aria-label={`Thêm hình vào gói ${g.ten}`}
          onChange={(e) => void nhanTep(e.target.files)} />

        <button type="button" onClick={() => oZip.current?.click()}
          disabled={dangNap > 0 || dangBung}
          className="nut-xam !min-h-[36px] !px-3 !text-[13px]">
          {dangBung
            ? <><Loader2 size={14} className="animate-spin" aria-hidden /> Đang mở gói…</>
            : <><FileArchive size={14} aria-hidden /> Tải cả tệp .zip</>}
        </button>
        <input ref={oZip} type="file" accept=".zip,application/zip" className="sr-only"
          aria-label={`Tải tệp zip vào gói ${g.ten}`}
          onChange={(e) => void nhanZip(e.target.files?.[0])} />
      </div>

      {tin && <p role="status" className="mt-2 text-[12px] font-medium text-nhan">{tin}</p>}
      {loi && <p role="alert" className="mt-2 text-[12px] font-medium text-xau">{loi}</p>}
    </section>
  );
}
