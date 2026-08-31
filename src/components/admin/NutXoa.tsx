'use client';

/**
 * Nút gửi biểu mẫu có hỏi lại trước khi mất dữ liệu.
 *
 * Trang sửa game là server component nên không tự gọi `confirm()` được, mà bốn
 * nút xoá ở đó (game / version / file / ảnh) trước đây bấm nhầm một cái là mất
 * luôn, không hoàn tác — trong khi mọi bảng quản trị khác đều hỏi lại. Đây là
 * phần client nhỏ nhất đủ để hỏi, form và server action vẫn giữ nguyên bên
 * ngoài: JavaScript hỏng thì nút vẫn gửi được như cũ, chỉ là không hỏi.
 */
export function NutXoa({ hoi, className, title, children, ...rest }: {
  hoi: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="submit"
      className={className}
      title={title}
      onClick={(e) => { if (!confirm(hoi)) e.preventDefault(); }}
      {...rest}
    >
      {children}
    </button>
  );
}
