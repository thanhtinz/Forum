'use client';

import { useEffect } from 'react';

/**
 * Đăng ký service worker, và chỉ ở BẢN DỰNG THẬT.
 *
 * `next dev` phục vụ tệp tĩnh theo kiểu khác hẳn và đổi tên tệp liên tục; một
 * service worker lưu đệm chồng lên đó cho ra những lỗi không lần được — sửa mã
 * xong tải lại vẫn thấy bản cũ, mà xoá `.next` cũng không ăn thua vì thứ cũ
 * nằm trong trình duyệt.
 *
 * Không có giao diện nào cả: đây là một mẩu việc chạy một lần sau khi trang đã
 * vẽ xong. Đặt trong `useEffect` để nó không tranh tài nguyên với lần vẽ đầu.
 */
export function DangKySW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    // Nuốt lỗi: trình duyệt chặn service worker (cửa sổ ẩn danh, thiết lập
    // riêng tư) là chuyện bình thường, và trang vẫn chạy đủ mà không cần nó.
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
