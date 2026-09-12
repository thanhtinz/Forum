'use client';

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export interface PhimXem {
  id: string;
  duongDan: string;
  anhBia: string | null;
}

/**
 * ĐOẠN PHIM XEM TRƯỚC, chạy khi cuộn tới — đúng lối App Store.
 *
 * CHẠY KHÔNG TIẾNG VÀ TỰ CHẠY, và hai điều đó buộc phải đi cùng nhau: trình
 * duyệt nào cũng CHẶN tự chạy nếu có tiếng, nên một đoạn phim bật tiếng sẵn thì
 * đứng im ở khung đầu. Ai muốn nghe thì bấm cái loa — lúc ấy là người dùng
 * quyết, và trình duyệt cho phép.
 *
 * DỪNG KHI RA KHỎI MÀN HÌNH. Không dừng thì cuộn xuống đọc đánh giá mà phim
 * vẫn chạy sau lưng, ngốn pin và dữ liệu di động của đúng nhóm người hay mở
 * cửa hàng này bằng 3G.
 *
 * `playsInline` là bắt buộc cho iPhone: thiếu nó, Safari giành lấy phim rồi mở
 * toàn màn hình ngang — người xem bị đá ra khỏi trang chỉ vì cuộn tới một đoạn
 * phim.
 */
export function PhimXemTruoc({ phim }: { phim: PhimXem }) {
  const oRef = useRef<HTMLVideoElement>(null);
  const [coTieng, datCoTieng] = useState(false);

  useEffect(() => {
    const o = oRef.current;
    if (!o) return;

    const theoDoi = new IntersectionObserver(
      ([muc]) => {
        if (muc.isIntersecting) {
          // `play()` trả về một lời hẹn và có thể bị từ chối (máy đang tiết
          // kiệm pin, hoặc người dùng đã tắt tự chạy). Nuốt lỗi: lúc ấy thẻ
          // `video` vẫn còn thanh điều khiển để bấm tay.
          void o.play().catch(() => {});
        } else {
          o.pause();
        }
      },
      // Phải lộ ra quá nửa mới chạy: chớm vào mép màn hình đã chạy thì cuộn
      // nhanh qua sẽ bật tắt liên tục.
      { threshold: 0.55 },
    );
    theoDoi.observe(o);
    return () => theoDoi.disconnect();
  }, []);

  return (
    <div className="relative shrink-0">
      <video ref={oRef} src={phim.duongDan} poster={phim.anhBia ?? undefined}
        muted={!coTieng} loop playsInline preload="metadata" controls
        className="max-h-52 w-auto rounded-the border border-vien bg-black sm:max-h-72" />

      {/* Nút loa đặt đè lên góc, không nằm ngoài khung: đây là nút của ĐOẠN
          PHIM NÀY, mà một trang có thể có ba đoạn. */}
      <button type="button" onClick={() => datCoTieng((v) => !v)}
        aria-label={coTieng ? 'Tắt tiếng đoạn phim' : 'Bật tiếng đoạn phim'}
        className="kinh absolute right-2 top-2 grid size-8 place-items-center rounded-full text-chu">
        {coTieng ? <Volume2 size={15} aria-hidden /> : <VolumeX size={15} aria-hidden />}
      </button>
    </div>
  );
}
