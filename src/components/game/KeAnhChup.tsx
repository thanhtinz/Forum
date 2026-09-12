'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { PhimXemTruoc, type PhimXem } from '@/components/game/PhimXemTruoc';

export interface AnhXem {
  id: string;
  duongDan: string;
  chuThich: string | null;
}

/*
 * KỆ ẢNH CHỤP, bấm vào xem cỡ lớn.
 *
 * Hai chuyện được sửa ở đây, cả hai đều là chuyện của một cửa hàng game CŨ:
 *
 * 1. KHÔNG PHÓNG MỜ. Bản trước ép mỗi ảnh cao đúng 208px (`h-52`), mà ảnh chụp
 *    game Java thường chỉ 128×128 hay 176×208 — tức là phóng to gần gấp rưỡi
 *    bằng phép nội suy mượt, và pixel art ra nhoè. Nay dùng `max-h` nên ảnh
 *    nhỏ đứng đúng cỡ thật của nó.
 *
 * 2. XEM ĐƯỢC CỠ LỚN. Ảnh 176px trên màn hình 1440px thì bé như con tem; người
 *    muốn xem game trông thế nào phải nheo mắt. Bấm vào là mở to — và phóng
 *    theo BỘI SỐ NGUYÊN (2x, 3x…) chứ không phóng cho vừa khung: phóng bội số
 *    nguyên kèm `image-rendering: pixelated` thì mỗi điểm ảnh gốc thành một ô
 *    vuông đều tăm tắp, đúng như xem trên máy thật. Phóng 2,37 lần thì viền
 *    nào cũng lệch một chút và cả ảnh trông bẩn.
 *
 * Dùng <dialog> thật với `showModal()`, không dựng lớp phủ bằng div: <dialog>
 * mang sẵn bẫy tiêu điểm, đóng bằng Esc, và chặn cuộn phía sau — ba thứ mà tự
 * viết thì lần nào cũng thiếu một.
 */
export function KeAnhChup({ anh, phim = [] }: { anh: AnhXem[]; phim?: PhimXem[] }) {
  const [dangXem, datDangXem] = useState<number | null>(null);
  const hopRef = useRef<HTMLDialogElement>(null);
  const anhRef = useRef<HTMLImageElement>(null);

  /** Phóng ảnh theo bội số nguyên lớn nhất mà vẫn vừa khung. */
  const canhCo = useCallback(() => {
    const el = anhRef.current;
    if (!el || !el.naturalWidth) return;
    const rongKhung = window.innerWidth * 0.92;
    const caoKhung = window.innerHeight * 0.8;
    const boi = Math.max(
      1,
      Math.floor(Math.min(rongKhung / el.naturalWidth, caoKhung / el.naturalHeight)),
    );
    // Ảnh vốn đã lớn hơn khung thì để CSS thu nhỏ cho vừa, đừng ép chiều rộng.
    el.style.width = boi > 1 ? `${el.naturalWidth * boi}px` : '';
  }, []);

  useEffect(() => {
    const hop = hopRef.current;
    if (!hop) return;
    if (dangXem === null) {
      if (hop.open) hop.close();
    } else if (!hop.open) {
      hop.showModal();
    }
  }, [dangXem]);

  useEffect(() => {
    if (dangXem === null) return;
    const doi = () => canhCo();
    window.addEventListener('resize', doi);
    return () => window.removeEventListener('resize', doi);
  }, [dangXem, canhCo]);

  const di = (buoc: number) => {
    datDangXem((cu) => (cu === null ? null : (cu + buoc + anh.length) % anh.length));
  };

  const hienTai = dangXem === null ? null : anh[dangXem];

  return (
    <>
      <section className="ke -mx-4 gap-3 px-4 sm:mx-0 sm:px-0" aria-label="Ảnh và phim trong game">
        {/*
          PHIM ĐỨNG TRƯỚC ẢNH, đúng thứ tự App Store dùng: với một game thì thứ
          đáng xem nhất là nó CHẠY như thế nào, mà ảnh tĩnh không nói được điều
          đó. Ai không quan tâm thì quệt một cái là tới ảnh.
        */}
        {phim.map((f) => <PhimXemTruoc key={f.id} phim={f} />)}

        {anh.map((a, i) => (
          <button key={a.id} type="button" onClick={() => datDangXem(i)}
            aria-label={a.chuThich ? `Xem to: ${a.chuThich}` : `Xem to ảnh ${i + 1}`}
            className="shrink-0 rounded-the border border-vien transition-transform hover:scale-[1.02]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.duongDan} alt={a.chuThich ?? ''} loading="lazy"
              className="anh-chup-game max-h-52 w-auto rounded-the sm:max-h-72" />
          </button>
        ))}
      </section>

      <dialog ref={hopRef} onClose={() => datDangXem(null)}
        className="max-h-none max-w-none bg-transparent backdrop:bg-black/80">
        {hienTai && (
          <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={anhRef} key={hienTai.id} src={hienTai.duongDan}
              alt={hienTai.chuThich ?? ''} onLoad={canhCo}
              className="anh-chup-game max-h-[80vh] max-w-[92vw] rounded-the" />

            {hienTai.chuThich && (
              <p className="max-w-[92vw] text-center text-[13px] text-white/90">{hienTai.chuThich}</p>
            )}

            <p className="text-[12px] font-semibold tabular-nums text-white/70">
              {(dangXem ?? 0) + 1}/{anh.length}
            </p>

            {anh.length > 1 && (
              <>
                <button type="button" onClick={() => di(-1)} aria-label="Ảnh trước"
                  className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70">
                  <ChevronLeft size={22} aria-hidden />
                </button>
                <button type="button" onClick={() => di(1)} aria-label="Ảnh sau"
                  className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70">
                  <ChevronRight size={22} aria-hidden />
                </button>
              </>
            )}

            {/* Nút đóng vẫn cần dù Esc đã đóng được: trên điện thoại không có Esc. */}
            <button type="button" onClick={() => datDangXem(null)} aria-label="Đóng"
              className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-black/50 text-white hover:bg-black/70">
              <X size={22} aria-hidden />
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
