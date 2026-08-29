'use client';

import { useEffect } from 'react';

/**
 * Khoá cuộn trang nền khi một lớp phủ đang mở.
 *
 * Mở hộp thoại hay ngăn kéo rồi lăn chuột mà trang phía sau trôi đi là cảm giác
 * hỏng rõ nhất của một lớp phủ tự dựng — trên điện thoại còn tệ hơn, vì vuốt để
 * cuộn nội dung trong lớp phủ lại kéo luôn cả trang bên dưới.
 *
 * Tách riêng ra khỏi `Modal` vì không phải lớp phủ nào cũng là hộp thoại: ngăn
 * kéo điều hướng và tấm trượt bộ lọc có hình dạng riêng, ép chúng vào `Modal`
 * là biến chúng thành hộp thoại giữa màn hình. Chúng chỉ cần đúng phần này.
 *
 * Giữ nguyên giá trị cũ rồi trả lại đúng như thế, chứ không đặt cứng về `''`:
 * đặt cứng sẽ xoá mất `overflow` mà trang có thể đã tự đặt vì lý do khác.
 */
export function useKhoaCuon(dangMo: boolean): void {
  useEffect(() => {
    if (!dangMo) return;
    const cu = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = cu; };
  }, [dangMo]);
}
