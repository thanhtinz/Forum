/*
 * MẤY CON SỐ CỦA MÃ ĐẶT LẠI MẬT KHẨU.
 *
 * Tệp này KHÔNG import gì để bài kiểm `.mjs` nạp thẳng được.
 */

/**
 * Mã sống được bao lâu.
 *
 * Một ngày, không phải mười lăm phút như lối gửi email quen thuộc. Ở đây mã đi
 * từ tay ban quản trị sang tay người xin — qua tin nhắn, qua điện thoại, có
 * khi qua một người thứ ba — nên cái hạn phải chịu được nhịp của người thật,
 * không phải nhịp của máy chủ thư. Ngắn hơn thì phần lớn mã chết trước khi tới
 * nơi, và ai cũng phải xin lại lần hai.
 */
export const HAN_MA_GIO = 24;

/** Số byte ngẫu nhiên của mã. 32 byte là mức không ai dò nổi bằng cách thử. */
export const SO_BYTE_MA = 32;

/**
 * Mã in ra cho người đọc được chia thành cụm 4 ký tự.
 *
 * Mã trần là một dãy 43 ký tự liền tù tì; ai đọc qua điện thoại cho người khác
 * chép cũng lạc chỗ. Cắt cụm thì đọc được thành tiếng, mà lúc nhập vào thì ta
 * bỏ hết gạch nối đi nên người dùng gõ kiểu nào cũng nhận.
 */
export const CUM_MA = 4;

/** Dọn gạch nối, khoảng trắng do người gõ thêm vào — rồi mới đem đi tra. */
export function donMa(chu: string): string {
  return chu.replace(/[\s-]+/g, '').trim();
}

/** Chia mã thành cụm cho dễ đọc. */
export function chiaCum(ma: string): string {
  return (ma.match(new RegExp(`.{1,${CUM_MA}}`, 'g')) ?? [ma]).join('-');
}
