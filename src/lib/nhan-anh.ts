import 'server-only';
import { AnhKhongHopLeError } from './dia-chi-anh';
import { getR2Config } from './storage';
import { taiAnhVeKho } from './tai-anh';

/**
 * Một cửa duy nhất cho mọi ảnh đi vào trang: dù người dùng tải lên hay dán
 * địa chỉ, dù là ảnh đại diện hay ảnh slide của quản trị, cuối cùng ảnh đều
 * nằm trong kho của mình.
 *
 * Trước đây tám chỗ nhận địa chỉ ảnh ngoài rồi lưu NGUYÊN địa chỉ ấy. Ba cái
 * hỏng đi kèm:
 *
 *  • người ta đổi hay xoá ảnh là trang mình vỡ ảnh, mà mình không biết;
 *  • mỗi lượt xem trang là một lượt mình gửi người xem sang máy chủ khác —
 *    họ đọc được ai đang xem gì;
 *  • ảnh không đi qua R2 nên không được hưởng bộ nhớ đệm và tên miền của
 *    mình, mà cấu hình R2 trong quản trị hoá ra chỉ áp cho một phần ảnh.
 *
 * Đường dẫn nội bộ và ảnh đã nằm trên chính R2 của mình thì giữ nguyên — chép
 * lại một tấm ảnh đã ở trong kho chỉ tổ đẻ ra bản trùng mỗi lần lưu biểu mẫu.
 */
export async function nhanAnhVaoKho(gt: string | null | undefined): Promise<string | null> {
  const v = (gt ?? '').trim();
  if (!v) return null;

  // Đã là đường dẫn nội bộ. Loại `//…` ra: trình duyệt đọc `//evil.com/a.png`
  // là địa chỉ NGOÀI theo giao thức hiện tại, nên lọt qua đây là dính đúng ba
  // tác hại kể ở trên — chỉ khác là không có lấy một chữ `http` để mà thấy.
  if (v.startsWith('/') && !v.startsWith('//')) return v;

  if (!/^https?:\/\//i.test(v)) {
    throw new AnhKhongHopLeError('Ảnh phải là link http(s) hoặc ảnh đã tải lên.');
  }

  // Đã nằm trên chính kho R2 của mình thì thôi.
  const cfg = await getR2Config();
  if (cfg.enabled && cfg.publicUrl && v.startsWith(`${cfg.publicUrl}/`)) return v;

  return taiAnhVeKho(v, true);
}

export { AnhKhongHopLeError };
