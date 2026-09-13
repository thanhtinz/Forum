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

/*
 * BẢNG CHỮ CỦA MÃ — base32 theo RFC 4648, và đây là một lựa chọn ĐÃ SỬA.
 *
 * Bản đầu dùng `base64url`, tức bảng chữ có cả `-` và `_`. Mà mã in ra cho
 * người đọc thì cắt cụm bằng dấu `-`, còn `donMa` lúc nhận vào thì xoá sạch
 * gạch ngang — nên cái gạch NẰM TRONG mã cũng bị xoá luôn và mã hỏng. Gần một
 * nửa số mã sinh ra có ít nhất một gạch, nên lỗi này hỏng lúc được lúc không:
 * bài kiểm 58 xanh là do may chứ không do đúng, mãi tới khi bài 59 chạy đúng
 * cả vòng gửi thư mới lòi ra.
 *
 * Bảng base32 không có `-` lẫn `_`, nên cái bẫy ấy biến mất hẳn chứ không phải
 * được vá. Nó cũng bỏ luôn `0`, `1`, `8`, `9` — mấy chữ hay bị đọc nhầm thành
 * `O`, `I`, `B`, `g` khi người này đọc cho người kia chép.
 */
const BANG_CHU = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Mấy byte ngẫu nhiên → chuỗi base32, không có ký tự đệm.
 *
 * Gom từng 5 bit một: 32 byte ra 52 ký tự. Bỏ phần đệm `=` ở cuối vì mã này
 * không đi qua chỗ nào đòi đúng bội của 8 ký tự, mà dấu `=` thì lại vướng khi
 * nhét vào địa chỉ.
 */
export function machBase32(byte: Uint8Array): string {
  let dem = 0;
  let soBit = 0;
  let ra = '';

  for (const b of byte) {
    dem = (dem << 8) | b;
    soBit += 8;
    while (soBit >= 5) {
      ra += BANG_CHU[(dem >>> (soBit - 5)) & 31];
      soBit -= 5;
    }
  }
  if (soBit > 0) ra += BANG_CHU[(dem << (5 - soBit)) & 31];

  return ra;
}

/**
 * Mã in ra cho người đọc được chia thành cụm 4 ký tự.
 *
 * Mã trần là một dãy 43 ký tự liền tù tì; ai đọc qua điện thoại cho người khác
 * chép cũng lạc chỗ. Cắt cụm thì đọc được thành tiếng, mà lúc nhập vào thì ta
 * bỏ hết gạch nối đi nên người dùng gõ kiểu nào cũng nhận.
 */
export const CUM_MA = 4;

/**
 * Dọn mã người ta gõ vào: bỏ gạch nối, khoảng trắng, và nâng hết lên chữ hoa.
 *
 * Nâng chữ hoa vì base32 không phân biệt hoa thường, mà người chép tay thì gõ
 * kiểu nào cũng có. Cả lúc PHÁT lẫn lúc TRA đều đi qua hàm này trước khi băm,
 * nên hai bên luôn băm đúng một chuỗi — quên một bên là mã đúng vẫn bị chối.
 */
export function donMa(chu: string): string {
  return chu.replace(/[\s-]+/g, '').trim().toUpperCase();
}

/** Chia mã thành cụm cho dễ đọc. */
export function chiaCum(ma: string): string {
  return (ma.match(new RegExp(`.{1,${CUM_MA}}`, 'g')) ?? [ma]).join('-');
}

/**
 * Câu trả lời DUY NHẤT sau khi xin mã, dù email ấy có tài khoản hay không.
 *
 * Để ở đây vì cả việc ở máy chủ lẫn biểu mẫu ở trình duyệt đều cần tới nó, mà
 * tệp `'use server'` thì không export được một chuỗi — nó chỉ cho export hàm
 * bất đồng bộ.
 *
 * Nói riêng "email này chưa đăng ký" là biến chỗ xin mã thành máy dò danh sách
 * thành viên: gõ thử một nghìn địa chỉ là biết ai có mặt trên trang.
 */
export const CAU_DA_GUI =
  'Nếu địa chỉ ấy có tài khoản, thư kèm mã đã được gửi đi. Nhớ ngó cả hộp thư rác.';
