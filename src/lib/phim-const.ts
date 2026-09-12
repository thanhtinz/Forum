/*
 * LUẬT VỀ ĐOẠN PHIM XEM TRƯỚC.
 *
 * Chép theo hướng dẫn tài sản của App Store: "You can have up to three app
 * previews on your product page and up to three may appear in search results."
 *
 * Trần dung lượng thì là luật của riêng cửa hàng này, không phải của Apple: ở
 * đây phim đi qua kho R2 và người xem phần lớn dùng mạng di động, nên 40MB là
 * chỗ dừng — đủ cho một đoạn ba mươi giây rõ nét, mà không thành thứ ngốn hết
 * dung lượng 3G của người ta trước khi họ kịp tải game.
 *
 * Tệp này KHÔNG import gì để bài kiểm `.mjs` nạp thẳng được.
 */

export const PHIM_TOI_DA = 3;
export const PHIM_NANG_TOI_DA = 40 * 1024 * 1024;
