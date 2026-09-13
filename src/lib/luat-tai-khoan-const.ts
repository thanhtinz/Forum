/*
 * TRẦN ĐỘ DÀI CỦA MẤY Ô NHẬP TÀI KHOẢN.
 *
 * Tách khỏi `dang-nhap/viec.ts` khi có thêm lối ĐẶT LẠI mật khẩu: nay có hai
 * cửa cùng ghi vào một cột mật khẩu, và hai cửa vào cùng một cột thì phải cùng
 * một luật. Chép con số sang tệp thứ hai là chuẩn bị sẵn cho ngày ai đó nới
 * một bên rồi quên bên kia.
 *
 * Tệp này KHÔNG import gì để bài kiểm `.mjs` nạp thẳng được.
 */

export const TEN_TOI_DA = 40;
export const EMAIL_TOI_DA = 190;

/**
 * Trần mật khẩu không phải để bắt bẻ ai: bcrypt băm chuỗi dài nào cũng tốn CPU
 * theo độ dài, nên một ô nhập không trần là một lối làm nghẽn máy chủ.
 */
export const MAT_KHAU_TOI_DA = 200;

/** Ngắn hơn mức này thì mật khẩu đoán ra trong tầm với của máy để bàn. */
export const MAT_KHAU_TOI_THIEU = 8;
