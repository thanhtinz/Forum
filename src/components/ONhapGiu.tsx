'use client';

import { useState } from 'react';

/*
 * Ô NHẬP TỰ GIỮ LẤY CHỮ ĐANG GÕ.
 *
 * React 19 XOÁ TRẮNG biểu mẫu sau khi một `action` chạy xong — kể cả khi hàm
 * ấy trả về lỗi. Nghĩa là gửi hỏng một lần là mất sạch chữ vừa gõ, và người
 * dùng phải gõ lại từ đầu để đọc được câu báo lỗi nói họ gõ sai chỗ nào. Với ô
 * mang `defaultValue` thì còn khó hiểu hơn: chữ không mất trắng mà nhảy NGƯỢC
 * về giá trị cũ trong cơ sở dữ liệu, trông y như máy chủ đã lưu rồi.
 *
 * Chỗ này đã cắn một lần thật: bài kiểm 48 bắt được đúng nó ở biểu mẫu xin làm
 * tác giả — gửi hỏng vì lý do quá ngắn, và tên tác giả vừa gõ biến mất.
 *
 * Ô có trạng thái riêng thì React không đụng tới được, nên chữ ở lại. Dùng nó
 * thay cho `<input defaultValue=…>` trong MỌI biểu mẫu chạy bằng `action`.
 *
 * Không nhận `value`: ô này tự giữ lấy chữ, ai muốn điều khiển từ ngoài thì
 * dùng thẳng `<input>` chứ đừng dùng ô này.
 */
type ChungInput = Omit<React.ComponentProps<'input'>, 'value' | 'defaultValue'>;
type ChungTextarea = Omit<React.ComponentProps<'textarea'>, 'value' | 'defaultValue'>;

export function ONhapGiu({ banDau = '', onChange, ...conLai }: ChungInput & { banDau?: string }) {
  const [chu, datChu] = useState(banDau);
  return (
    <input {...conLai} value={chu}
      onChange={(e) => { datChu(e.target.value); onChange?.(e); }} />
  );
}

export function OChuGiu({ banDau = '', onChange, ...conLai }: ChungTextarea & { banDau?: string }) {
  const [chu, datChu] = useState(banDau);
  return (
    <textarea {...conLai} value={chu}
      onChange={(e) => { datChu(e.target.value); onChange?.(e); }} />
  );
}
