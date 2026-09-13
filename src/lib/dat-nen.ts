import { cookies } from 'next/headers';

/** Tên bánh quy giữ lựa chọn nền. */
export const COOKIE_NEN = 'sunny-nen';

export type MaNen = 'sang' | 'toi';

/*
 * NỀN SÁNG / TỐI ĐỌC TỪ BÁNH QUY, KHÔNG TỪ `localStorage`.
 *
 * Bản trước giữ lựa chọn trong `localStorage` rồi nhét một đoạn mã nhỏ vào
 * `<head>` để đặt `data-nen` trước khi trang vẽ. Nghe thì gọn, mà nó hỏng thật:
 *
 *   • Máy chủ dựng ra `<html>` KHÔNG có `data-nen`, còn trình duyệt thì có —
 *     hai bản khác nhau, nên React báo lỗi hydration (mã 418) rồi tự dựng lại
 *     thẻ `<html>` cho khớp bản của máy chủ. Dựng lại tức là XOÁ mất
 *     `data-nen`. Người chọn nền tối mở trang ra thấy tối đúng một khoảnh
 *     khắc, hydration xong là trắng loá.
 *   • `suppressHydrationWarning` chỉ tắt lời cảnh báo trong bảng điều khiển,
 *     không ngăn React sửa lại thẻ. Đó là chỗ đã nhầm.
 *
 * Bánh quy thì máy chủ ĐỌC ĐƯỢC, nên `<html data-nen="toi">` có sẵn ngay trong
 * bản dựng đầu tiên: không nháy trắng, không lệch bản, và không cần đoạn mã
 * chèn vào `<head>` nữa.
 *
 * Vẫn là lựa chọn của CÁI MÁY chứ không của tài khoản — cùng một người có thể
 * muốn tối trên điện thoại và sáng trên máy bàn — nên bánh quy này không đụng
 * gì tới phiên đăng nhập.
 */
export async function docNen(): Promise<MaNen> {
  const kho = await cookies();
  return kho.get(COOKIE_NEN)?.value === 'toi' ? 'toi' : 'sang';
}
