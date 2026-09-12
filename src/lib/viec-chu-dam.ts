'use server';

import { dungChuDam } from '@/lib/chu-dam';

/**
 * Dựng thử Markdown thành HTML, cho ô XEM TRƯỚC của trình soạn thảo.
 *
 * Ở MÁY CHỦ chứ không ở trình duyệt, dù `dungChuDam` chạy được cả hai nơi: bộ
 * dựng Markdown nặng cả trăm kilobyte, mà gói nó vào bản dựng cho trình duyệt
 * thì mọi người mở trang đều tải, kể cả người chỉ đọc. Đổi lại một lượt gọi
 * mạng mỗi lần ngừng gõ — rẻ hơn nhiều.
 *
 * Nằm ở tệp riêng chứ không nằm trong `viec.ts` của khu quản trị, vì từ đợt
 * này trình soạn thảo còn dùng ở DIỄN ĐÀN: một thành viên thường soạn bài
 * không có lý gì phải nạp cả tệp hành động của khu quản trị.
 *
 * Không kiểm quyền, và đó là chủ ý: hàm này chỉ dựng chuỗi người gọi tự gửi
 * lên rồi trả về, không đọc không ghi gì cả. Cắt ở hai mươi nghìn ký tự để
 * không ai biến nó thành chỗ bắt máy chủ nghiền chữ hộ.
 */
export async function xemThuChuDam(chu: string): Promise<string> {
  return dungChuDam(String(chu ?? '').slice(0, 20_000));
}
