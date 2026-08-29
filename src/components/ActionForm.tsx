'use client';

import { startTransition, type FormHTMLAttributes, type Ref } from 'react';

type Props = Omit<FormHTMLAttributes<HTMLFormElement>, 'action' | 'onSubmit'> & {
  /** Hàm dispatch lấy từ useActionState. */
  action: (formData: FormData) => void;
  /** Chuyển thẳng xuống thẻ form, để nơi gọi tự reset khi lưu xong. */
  ref?: Ref<HTMLFormElement>;
};

/**
 * Form dùng Server Action nhưng KHÔNG bị React xoá trắng ô nhập.
 *
 * React 19 tự reset mọi ô nhập sau khi `<form action={fn}>` chạy xong — kể cả khi
 * action trả về lỗi kiểm tra. Người dùng gõ cả bài dài rồi thiếu một trường là mất sạch.
 * Gọi action thủ công trong transition thì React không đụng tới form, nên nội dung
 * còn nguyên để sửa lại. Form nào cần dọn sau khi lưu thì tự gọi reset khi state.ok.
 *
 * `method="post"` không phải để form chạy được khi chưa có JavaScript — nó vẫn
 * không chạy. Nó để lúc CHƯA KỊP hydrate, cú bấm rơi vào đường gửi mặc định của
 * trình duyệt thì đừng là GET: GET nhét mọi ô nhập vào thanh địa chỉ, và ở form
 * đăng nhập thì thứ nhét vào đó là mật khẩu — nằm lại trong lịch sử trình duyệt
 * lẫn nhật ký máy chủ. Đã bắt gặp thật lúc chụp màn hình: trang vừa tải xong,
 * bấm Đăng nhập, địa chỉ đổi thành `/login?...&password=…`.
 */
export function ActionForm({ action, children, ...rest }: Props) {
  return (
    <form
      method="post"
      {...rest}
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => action(formData));
      }}
    >
      {children}
    </form>
  );
}
