'use client';

import { useEffect, useRef, useState } from 'react';

/** Gấp lại còn khoảng chừng này điểm ảnh — chừng bảy dòng chữ. */
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
  const [cao, datCao] = useState(CAO_GAP);
  const [mo, datMo] = useState(false);

  useEffect(() => {
    const o = oRef.current;
    if (!o) return;
    const do_ = () => {
      datDaiHon(o.scrollHeight > CAO_GAP + 24);
      /*
       * CẮT ĐÚNG MÉP MỘT DÒNG, không cắt giữa dòng.
       *
       * Để nguyên 184px thì chỗ cắt rơi vào đâu đó giữa dòng chữ, nên dưới
       * dòng cuối còn thừa một khoảng trống — và chữ "thêm" neo ở đáy khối lại
       * rơi vào đúng khoảng trống ấy thay vì nằm ngay cuối dòng bị cắt như
       * App Store. Làm tròn xuống bội của chiều cao một dòng thì đáy khối
       * trùng mép dòng, chữ "thêm" về đúng chỗ.
       */
      const dong = parseFloat(getComputedStyle(o).lineHeight);
      datCao(Number.isFinite(dong) && dong > 0
        ? Math.max(dong * 2, Math.floor(CAO_GAP / dong) * dong)
        : CAO_GAP);
    };
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
          style={!mo && daiHon ? { maxHeight: cao } : undefined}
          dangerouslySetInnerHTML={{ __html: html }} />

        {/* Dải mờ ở mép dưới: nó biến chỗ chữ bị cắt ngang thành chỗ mờ dần,
            và mắt đọc ra "còn nữa" chứ không đọc ra "hết rồi". */}
        {!mo && daiHon && (
          <span aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-nen/80 to-transparent" />
        )}

        {/*
          CHỮ "thêm" NẰM NGAY CUỐI DÒNG BỊ CẮT, không xuống hàng riêng.

          App Store đặt "more" đúng chỗ ấy, và nó khác một dòng riêng ở chỗ:
          mắt đang đọc dở câu thì gặp luôn lối đọc tiếp, chứ không phải đọc hụt
          rồi mới lia xuống tìm nút. Một vệt nền chuyển dần bên trái để chữ
          không dính vào chữ của bài.
        */}
        {!mo && daiHon && (
          <span className="absolute bottom-0 right-0 flex items-end">
            <span aria-hidden className="h-6 w-12 bg-gradient-to-r from-transparent to-nen" />
            <button type="button" onClick={() => datMo(true)} aria-expanded={false}
              className="bg-nen text-[14px] font-semibold text-nhan hover:underline">
              thêm
            </button>
          </span>
        )}
      </div>

      {mo && (
        <button type="button" onClick={() => datMo(false)} aria-expanded
          className="mt-1 text-[14px] font-semibold text-nhan hover:underline">
          Thu gọn
        </button>
      )}
    </div>
  );
}
