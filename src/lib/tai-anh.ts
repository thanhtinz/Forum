import 'server-only';
import { AnhKhongHopLeError, kiemDiaChiAnh } from './dia-chi-anh';
import { newObjectName, putFile, sniffImage } from './storage';

/**
 * Tải một ảnh từ địa chỉ ngoài về lưu nội bộ.
 *
 * Phần kiểm địa chỉ — chặn https, chặn mạng nội bộ — nằm ở `dia-chi-anh.ts`
 * để chạy thử được đứng một mình. Ở đây là ba lớp còn lại:
 *
 *  • không đi theo chuyển hướng, vì địa chỉ đầu sạch không có nghĩa là chỗ nó
 *    đẩy mình tới cũng sạch;
 *  • đọc có trần;
 *  • kiểu tệp lấy từ NỘI DUNG THẬT chứ không tin `content-type` máy chủ kia
 *    khai.
 */

const TOI_DA = 5 * 1024 * 1024;
const CHO = 20_000;
const NHAN = new Set(['jpg', 'png', 'gif', 'webp']);

export { AnhKhongHopLeError };



/** Tải ảnh về kho nội bộ, trả về đường dẫn công khai. */
export async function taiAnhVeKho(diaChi: string): Promise<string> {
  const u = await kiemDiaChiAnh(diaChi);

  const bo = new AbortController();
  const hen = setTimeout(() => bo.abort(), CHO);
  let res: Response;
  try {
    res = await fetch(u, { signal: bo.signal, redirect: 'error' });
  } catch {
    throw new AnhKhongHopLeError('Không tải được ảnh từ địa chỉ này.');
  } finally {
    clearTimeout(hen);
  }
  if (!res.ok) throw new AnhKhongHopLeError(`Máy chủ ảnh trả về lỗi ${res.status}.`);

  // `content-length` chỉ là lời khai, vẫn phải đếm lúc đọc; nhưng khai sẵn
  // quá trần thì bỏ luôn cho đỡ tốn băng thông.
  const khai = Number(res.headers.get('content-length') || 0);
  if (khai > TOI_DA) throw new AnhKhongHopLeError('Ảnh lớn quá 5MB.');

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > TOI_DA) throw new AnhKhongHopLeError('Ảnh lớn quá 5MB.');

  const kieu = sniffImage(buf);
  if (!kieu || !NHAN.has(kieu.ext)) {
    throw new AnhKhongHopLeError('Tệp tải về không phải ảnh JPG, PNG, GIF hay WebP.');
  }

  const luu = await putFile(buf, newObjectName(kieu.ext), kieu.mime);
  return luu.url;
}
