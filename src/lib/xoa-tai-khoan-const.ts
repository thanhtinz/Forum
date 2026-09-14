/*
 * XOÁ TÀI KHOẢN — mấy hằng số và phép biến đổi thuần.
 *
 * Tệp này KHÔNG import gì, để mấy bài kiểm `.mjs` nạp thẳng được: Node không
 * giải nổi bí danh `@/` trong đường dẫn.
 */

/** Người dùng phải gõ đúng câu này thì nút xoá mới ăn. */
export const CAU_XAC_NHAN = 'XOÁ TÀI KHOẢN CỦA TÔI';

/** Tên đứng thay ở mọi bài viết cũ sau khi người ấy đi. */
export const TEN_DA_XOA = 'Người dùng đã xoá';

/*
 * Email và tên đăng nhập sau khi chùi.
 *
 * Vẫn phải là một chuỗi DUY NHẤT chứ không để trống được — hai cột ấy mang
 * ràng buộc duy nhất, mà người thứ hai xoá tài khoản sẽ đụng ngay vào người
 * thứ nhất. Lấy `id` làm phần riêng thì không bao giờ trùng.
 *
 * Tên miền `nguoi-da-xoa.local` không tồn tại thật, nên kể cả có chỗ nào lỡ
 * gửi thư tới đó thì thư cũng không đi tới ai.
 */
export function emailDaXoa(id: string): string {
  return `da-xoa-${id}@nguoi-da-xoa.local`;
}

export function tenDangNhapDaXoa(id: string): string {
  return `da-xoa-${id}`;
}
