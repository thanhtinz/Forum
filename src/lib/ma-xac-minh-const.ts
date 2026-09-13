/*
 * MẤY CON SỐ CỦA MÃ XÁC MINH.
 *
 * Tệp này KHÔNG import gì để bài kiểm `.mjs` nạp thẳng được.
 */

/**
 * Sáu chữ số. Không phải một chuỗi dài ngẫu nhiên.
 *
 * Mã này đi tới người qua thư rồi người gõ lại bằng tay, có khi đọc qua điện
 * thoại cho nhau chép. Một dãy năm mươi ký tự thì không ai chép nổi. Sáu số là
 * mức mọi người đã quen từ ngân hàng tới ứng dụng nhắn tin.
 */
export const SO_CHU_SO = 6;

/**
 * Mã sống được bao lâu.
 *
 * Một giờ, không phải năm phút: mã đi qua hòm thư, mà hòm thư thì có lúc chậm
 * vài phút, người ta lại hay mở thư trên máy khác rồi mới quay về gõ. Cũng
 * không phải một ngày như bản mã dài trước đây — sáu số thì hạn càng dài càng
 * nhiều thời gian cho ai đó ngồi dò.
 */
export const HAN_MA_PHUT = 60;

/**
 * Gõ sai mấy lần thì mã chết hẳn.
 *
 * ĐÂY LÀ CHỐT QUAN TRỌNG NHẤT của cả cơ chế. Sáu số chỉ có một triệu khả năng,
 * nên nếu cho gõ thoải mái thì một kịch bản dò xong trong vài phút. Trần năm
 * lần biến một triệu khả năng thành xác suất năm phần triệu — mà người thật
 * thì hiếm khi gõ sai tới lần thứ ba.
 */
export const TOI_DA_SAI = 5;

/** Chia mã thành hai cụm ba số cho dễ đọc: "123 456". */
export function chiaCum(ma: string): string {
  return ma.length === 6 ? `${ma.slice(0, 3)} ${ma.slice(3)}` : ma;
}

/**
 * Dọn mã người ta gõ vào: chỉ giữ lại chữ số.
 *
 * Giữ đúng chữ số chứ không "bỏ khoảng trắng và gạch nối", vì người chép tay
 * thêm đủ thứ — dấu chấm, dấu ngoặc, cả chữ "mã:". Lọc theo thứ được giữ thì
 * không bao giờ sót một kiểu gõ lạ nào.
 */
export function donMa(chu: string): string {
  return chu.replace(/\D+/g, '');
}

/** Có phải một mã đúng hình dạng không — sáu chữ số, không hơn không kém. */
export function laMaHopLe(chu: string): boolean {
  return new RegExp(`^\\d{${SO_CHU_SO}}$`).test(chu);
}

/**
 * Câu trả lời DUY NHẤT sau khi xin mã, dù email ấy có tài khoản hay không.
 *
 * Nói riêng "email này chưa đăng ký" là biến chỗ xin mã thành máy dò danh sách
 * thành viên: gõ thử một nghìn địa chỉ là biết ai có mặt trên trang.
 */
export const CAU_DA_GUI =
  'Nếu địa chỉ ấy có tài khoản, thư kèm mã đã được gửi đi. Nhớ ngó cả hộp thư rác.';
