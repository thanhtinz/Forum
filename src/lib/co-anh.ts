/**
 * ĐỌC KÍCH THƯỚC ẢNH TỪ CHÍNH RUỘT TỆP.
 *
 * Apple nói về biểu tượng đúng một câu, mà câu ấy là câu khó nhất: "bảo đảm
 * biểu tượng đọc được ở MỌI cỡ, từ App Store tới Spotlight tới màn hình chính".
 * Không có cách nào giữ lời hứa ấy nếu nhận bừa một tấm 48×48 rồi phóng lên
 * 104 điểm ảnh — lúc ấy biểu tượng nhoè, và nhoè thì không đọc được.
 *
 * Nên phải biết ảnh to bao nhiêu TRƯỚC khi cất nó vào kho. Đọc thẳng vài chục
 * byte đầu, không gọi thư viện giải ảnh nào: mỗi định dạng ghi sẵn bề ngang và
 * bề cao ngay trong phần đầu tệp, mà kéo cả một bộ giải ảnh vào chỉ để đọc bốn
 * con số là trả giá đắt gấp nghìn lần thứ mình cần.
 *
 * Đọc được thì trả về số đo; không đọc được thì trả `null` và nơi gọi tự quyết
 * — chứ không đoán bừa một con số.
 */

export interface CoAnh { rong: number; cao: number }

export function doCoAnh(byte: Uint8Array, loai: string): CoAnh | null {
  const b = byte;
  const doc = new DataView(b.buffer, b.byteOffset, b.byteLength);

  switch (loai) {
    /*
     * PNG: khối IHDR luôn là khối đầu tiên, nằm ngay sau tám byte chữ ký.
     * Bề ngang ở byte 16, bề cao ở byte 20, cả hai là số nguyên bốn byte.
     */
    case 'png':
      if (b.length < 24) return null;
      return { rong: doc.getUint32(16), cao: doc.getUint32(20) };

    /*
     * GIF: hai số hai byte ngay sau chữ ký "GIF89a", và chúng ghi NGƯỢC —
     * byte thấp trước. Đây là định dạng của năm 1987, thời ấy người ta viết
     * số theo lối máy chứ chưa theo lối mạng.
     */
    case 'gif':
      if (b.length < 10) return null;
      return { rong: doc.getUint16(6, true), cao: doc.getUint16(8, true) };

    /*
     * JPEG không ghi kích thước ở một chỗ cố định: tệp là một dãy khối, mỗi
     * khối mở đầu bằng 0xFF rồi tới mã khối và độ dài của nó. Số đo nằm trong
     * khối SOF (0xC0…0xCF, trừ 0xC4, 0xC8, 0xCC là ba khối làm việc khác).
     * Nên phải NHẢY qua từng khối cho tới lúc gặp SOF.
     */
    case 'jpg': {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) { i++; continue; }
        const ma = b[i + 1];
        if (ma >= 0xc0 && ma <= 0xcf && ma !== 0xc4 && ma !== 0xc8 && ma !== 0xcc) {
          return { cao: doc.getUint16(i + 5), rong: doc.getUint16(i + 7) };
        }
        // Mấy khối không mang dữ liệu (0xD0…0xD9) không có ô độ dài để nhảy.
        if (ma >= 0xd0 && ma <= 0xd9) { i += 2; continue; }
        i += 2 + doc.getUint16(i + 2);
      }
      return null;
    }

    /*
     * WebP có ba lối ghi khác nhau, tuỳ tệp là bản thường, bản không mất dữ
     * liệu, hay bản mở rộng. Cả ba đều nói rõ mình là lối nào ở byte 12.
     */
    case 'webp': {
      if (b.length < 30) return null;
      const lo = String.fromCharCode(b[12], b[13], b[14], b[15]);
      // VP8 thường: số đo là 14 bit, hai bit cao dành cho tỉ lệ thu nhỏ.
      if (lo === 'VP8 ') {
        return { rong: doc.getUint16(26, true) & 0x3fff, cao: doc.getUint16(28, true) & 0x3fff };
      }
      // VP8L: bốn số 14 bit nhồi chung vào một số bốn byte, và đếm từ 0.
      if (lo === 'VP8L') {
        const n = doc.getUint32(21, true);
        return { rong: (n & 0x3fff) + 1, cao: ((n >> 14) & 0x3fff) + 1 };
      }
      // VP8X: số đo ghi thẳng, ba byte mỗi chiều, cũng đếm từ 0.
      if (lo === 'VP8X') {
        const rong = (b[24] | (b[25] << 8) | (b[26] << 16)) + 1;
        const cao = (b[27] | (b[28] << 8) | (b[29] << 16)) + 1;
        return { rong, cao };
      }
      return null;
    }

    default:
      return null;
  }
}
