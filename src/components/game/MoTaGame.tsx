'use client';

import { useEffect, useRef, useState } from 'react';

/** Gấp lại còn chừng này điểm ảnh — khoảng bảy dòng chữ. */
const CAO_GAP = 184;

/**
 * PHẦN MÔ TẢ GẤP LẠI, có nút "xem thêm".
 *
 * App Store cắt mô tả còn ba dòng vì mô tả ứng dụng thời nay dài cả trang, mà
 * thứ nằm ngay dưới nó — ảnh chụp, đánh giá — mới là thứ người ta cuộn xuống
 * tìm. Ở đây cũng vậy: người bày hàng viết mô tả có đầu đề, danh sách, bảng,
 * và một mô tả dài đẩy phần đánh giá xuống tận đáy màn hình thứ ba.
 *
 * Nút chỉ hiện khi chữ THẬT SỰ dài hơn chỗ được gấp. Mô tả ba dòng mà vẫn có
 * nút "xem thêm" thì bấm vào chẳng thấy gì mới — một lời hứa suông.
 *
 * Đo bằng `scrollHeight` sau khi dựng xong, không đếm ký tự: cùng một đoạn chữ
 * ở điện thoại cao gấp ba lần ở máy bàn, mà đếm ký tự thì không biết điều ấy.
 */
export function MoTaGame({ html }: { html: string }) {
  const oRef = useRef<HTMLDivElement>(null);
  const [daiHon, datDaiHon] = useState(false);
  const [mo, datMo] = useState(false);

  useEffect(() => {
    const o = oRef.current;
    if (!o) return;
    const do_ = () => datDaiHon(o.scrollHeight > CAO_GAP + 24);
    do_();
    // Xoay ngang máy hay đổi bề ngang cửa sổ là chữ xuống dòng khác đi, nên
    // chỗ đủ hôm nay có thể thành chỗ thiếu ngay sau đó.
    const theoDoi = new ResizeObserver(do_);
    theoDoi.observe(o);
    return () => theoDoi.disconnect();
  }, [html]);

  return (
    <div>
      <div className="relative">
        {/*
          `dangerouslySetInnerHTML` ở đây KHÔNG nguy hiểm: `dungChuDam` bật
          `html: false`, nên mọi thẻ gõ tay trong phần mô tả đều bị escape
          thành chữ thường. Đầu ra chỉ chứa thẻ do chính bộ dựng sinh.
        */}
        <div ref={oRef} className="chu-dam overflow-hidden"
          style={!mo && daiHon ? { maxHeight: CAO_GAP } : undefined}
          dangerouslySetInnerHTML={{ __html: html }} />

        {/* Dải mờ ở mép dưới: nó biến chỗ chữ bị cắt ngang thành chỗ mờ dần,
            và mắt đọc ra "còn nữa" chứ không đọc ra "hết rồi". */}
        {!mo && daiHon && (
          <span aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-nen to-transparent" />
        )}
      </div>

      {daiHon && (
        <button type="button" onClick={() => datMo(!mo)} aria-expanded={mo}
          className="mt-1 text-[14px] font-semibold text-nhan hover:underline">
          {mo ? 'Thu gọn' : 'xem thêm'}
        </button>
      )}
    </div>
  );
}
