/*
 * MẤY TRANG TĨNH CỦA CỬA HÀNG — giới thiệu, điều khoản, liên hệ.
 *
 * Gom danh sách vào một chỗ vì có HAI nơi phải biết nó: chân trang dựng liên
 * kết, và bài kiểm đi từng trang một. Hai bản chép rời thì thêm một trang mới
 * là chân trang có mà bài kiểm không.
 *
 * Tệp này KHÔNG import gì, để bài kiểm `.mjs` nạp thẳng được.
 */

export const TRANG_TINH = [
  { duongDan: '/gioi-thieu', ten: 'Giới thiệu' },
  { duongDan: '/dieu-khoan', ten: 'Điều khoản' },
  { duongDan: '/lien-he', ten: 'Liên hệ' },
] as const;
