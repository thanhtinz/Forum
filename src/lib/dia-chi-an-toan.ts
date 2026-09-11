/**
 * Kiểm một địa chỉ do người nhập gõ vào: TỆP hay ẢNH.
 *
 * VÌ SAO KHÔNG SO ĐẦU CHUỖI NỮA.
 *
 * Cả bốn chỗ trong dự án trước đây đều viết `x.startsWith('/')` với ý "đường
 * dẫn trong nhà". Nhưng `//vi-du.test/x.jar` cũng bắt đầu bằng `/`, mà trình
 * duyệt đọc nó là "cùng giao thức, KHÁC MÁY CHỦ" — nên nó lọt qua câu kiểm rồi
 * trỏ ra ngoài. `/\vi-du.test/x.jar` cũng vậy: dấu gạch ngược bị coi như gạch
 * xuôi.
 *
 * Chỗ đau nhất là cổng `/api/tai/…`: nó `redirect` tới địa chỉ ấy, nên một
 * đường dẫn kiểu `//…` biến liên kết mang tên miền cửa hàng thành liên kết dẫn
 * đi bất cứ đâu — đúng thứ người ta dùng để lừa người khác bấm.
 *
 * Nên ở đây PHÂN TÍCH địa chỉ chứ không so chuỗi: dựng thử `URL` rồi xem nó ra
 * cái gì. Cách ấy đúng với mọi kiểu viết tắt mà trình duyệt hiểu, kể cả những
 * kiểu chưa ai nghĩ ra.
 */

export type KieuDiaChi = 'trong-nha' | 'https' | 'hong';

/** Một mốc giả, chỉ để `URL` có gốc mà suy ra. Không đi đâu thật. */
const GOC_GIA = 'https://sunnystore.invalid';

export function xemDiaChi(chu: string): KieuDiaChi {
  const s = chu.trim();
  if (!s) return 'hong';

  let u: URL;
  try {
    u = new URL(s, GOC_GIA);
  } catch {
    return 'hong';
  }

  // Ra đúng máy chủ giả nghĩa là địa chỉ này thuần tuý là đường dẫn trong nhà.
  // `//vi-du.test/x` hay `/\vi-du.test/x` sẽ ra máy chủ khác, nên rơi khỏi đây.
  if (u.origin === GOC_GIA) {
    // Chặn luôn `..`: người nhập không có việc gì phải leo thư mục, mà mấy
    // đoạn ấy còn khiến đường dẫn lưu trong CSDL khác đường dẫn lúc phục vụ.
    return s.startsWith('/') && !s.includes('..') ? 'trong-nha' : 'hong';
  }

  // Ra máy chủ khác thì BẮT BUỘC phải viết rõ `https:`. Gõ tắt kiểu `//máy-chủ`
  // là chỗ lách, còn `http:` thì tệp tải về đi qua đường không mã hoá.
  return u.protocol === 'https:' && s.toLowerCase().startsWith('https://') ? 'https' : 'hong';
}

/** Địa chỉ tệp hoặc ảnh: nhận cả trong nhà lẫn `https://`. */
export function laDiaChiHopLe(chu: string): boolean {
  return xemDiaChi(chu) !== 'hong';
}

/** Địa chỉ BẮT BUỘC ra ngoài, như liên kết sang App Store hay CH Play. */
export function laHttpsHopLe(chu: string): boolean {
  return xemDiaChi(chu) === 'https';
}

/** Câu báo dùng chung, để bốn chỗ không mỗi chỗ nói một kiểu. */
export const LOI_DIA_CHI =
  'Địa chỉ phải là đường dẫn trong trang (bắt đầu bằng “/”) hoặc một địa chỉ https đầy đủ.';
