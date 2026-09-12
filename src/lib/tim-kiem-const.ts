/**
 * Chuẩn hoá chữ để TÌM KIẾM.
 *
 * Tệp này KHÔNG import gì, để kịch bản gieo dữ liệu (`.ts` chạy bằng tsx) và
 * mấy bài kiểm `.mjs` đều nạp thẳng được.
 *
 * VÌ SAO PHẢI CÓ: người Việt gõ trên điện thoại phần lớn KHÔNG bỏ dấu. Gõ
 * "rong" mà không ra "Thợ săn rồng", gõ "dua xe" mà không ra "Đua xe", thì với
 * người dùng đó là "cửa hàng không có game ấy" — họ không biết mình vừa thua
 * một dấu huyền. Đây là lỗi nặng nhất mà một ô tìm kiếm tiếng Việt mắc được.
 */

/** "Thợ Săn Rồng" → "tho san rong" */
export function khongDau(chu: string): string {
  return chu
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // gỡ dấu thanh và dấu mũ
    // Đ/đ là CHỮ CÁI RIÊNG trong bảng chữ cái, không phải D kèm dấu, nên bước
    // trên không đụng tới nó. Thiếu dòng này thì "Đua xe" ra "ua xe".
    .replace(/Đ/g, 'D').replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Dựng chuỗi tìm kiếm của một game — gộp mọi thứ người ta có thể gõ để tìm nó.
 *
 * Gộp sẵn vào MỘT cột thay vì `OR` qua bốn cột lúc truy vấn: một cột thì thêm
 * được chỉ mục, mà bốn điều kiện `contains` nối bằng `OR` thì CSDL quét cả
 * bảng bốn lượt. Ở cỡ cửa hàng này chưa thấy chậm, nhưng cấu trúc đúng thì để sẵn
 * từ đầu rẻ hơn sửa sau.
 *
 * Có cả tên thể loại: gõ "dua xe" là ra mấy game đua xe, dù không game nào
 * mang chữ ấy trong tên.
 */
export function dungChuoiTim(g: {
  ten: string;
  tenViet?: string | null;
  nhaPhatTrien?: string | null;
  theLoai?: string[];
}): string {
  return khongDau([
    g.ten,
    g.tenViet ?? '',
    g.nhaPhatTrien ?? '',
    ...(g.theLoai ?? []),
  ].filter(Boolean).join(' '));
}

/**
 * Dựng chuỗi tìm kiếm của một chủ đề diễn đàn.
 *
 * GỘP CẢ PHẦN NỘI DUNG, không riêng tiêu đề. Người đi hỏi thường đặt tiêu đề
 * rất mơ hồ — "giúp mình với", "ai biết chỉ mình" — rồi mới tả rõ chuyện gặp
 * phải ở thân bài. Tìm theo mỗi tiêu đề thì đúng những chủ đề ấy không bao giờ
 * ra, mà chúng lại là chủ đề người sau gặp cùng lỗi cần đọc nhất.
 *
 * Cái giá là một bản sao đã bỏ dấu của thân bài nằm trong CSDL. Chấp nhận
 * được: chữ là thứ rẻ nhất trong cửa hàng này, còn một ô tìm kiếm không ra gì thì
 * người ta thôi dùng.
 */
export function dungChuoiTimChuDe(c: { tieuDe: string; noiDung: string }): string {
  return khongDau(`${c.tieuDe} ${c.noiDung}`);
}
