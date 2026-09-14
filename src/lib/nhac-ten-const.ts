/*
 * NHẮC TÊN NGƯỜI KHÁC TRONG BÀI VIẾT: `@ten-dang-nhap`.
 *
 * Tệp này KHÔNG import gì, để mấy bài kiểm `.mjs` nạp thẳng được — và để bộ
 * dựng chữ đậm lẫn hàm gửi thông báo cùng dùng ĐÚNG MỘT bản luật. Hai bản
 * riêng thì sớm muộn cũng có ngày trang in ra một cái tên xanh mà người ấy
 * chẳng nhận được thông báo nào, hoặc ngược lại.
 */

/** Tên đăng nhập của cửa hàng: chữ thường, số và gạch nối — xem `thanhDuongDan`. */
export const MAU_TEN = '[a-z0-9]+(?:-[a-z0-9]+)*';

/**
 * Chỉ nhận `@` đứng ĐẦU DÒNG hoặc sau một khoảng trắng.
 *
 * Thiếu vế ấy thì một địa chỉ thư trong bài — `ai-do@vi-du.test` — cũng bị bắt
 * làm lời nhắc, và người tên `vi-du` bỗng nhận thông báo vì một câu chẳng liên
 * quan gì tới họ.
 */
export const MAU_NHAC = new RegExp(`(^|\\s)@(${MAU_TEN})`, 'g');

/*
 * Trần số người một bài nhắc được.
 *
 * Không có trần thì một bài dán hai trăm cái tên là hai trăm thông báo bay đi
 * trong một lượt gửi — vừa làm người bấm Gửi ngồi đợi, vừa là đường rải tin
 * rác rẻ nhất trong cả cửa hàng.
 */
export const TOI_DA_NHAC = 10;

/**
 * Bóc danh sách tên được nhắc trong một bài viết.
 *
 * Trả về tên đã dọn trùng và giữ nguyên thứ tự xuất hiện — người viết gõ ai
 * trước thì người ấy được báo trước.
 */
export function bocTenNhac(chu: string | null | undefined, toiDa = TOI_DA_NHAC): string[] {
  const ra: string[] = [];
  const thay = new Set<string>();

  for (const m of String(chu ?? '').matchAll(MAU_NHAC)) {
    const ten = m[2].toLowerCase();
    if (thay.has(ten)) continue;
    thay.add(ten);
    ra.push(ten);
    if (ra.length >= toiDa) break;
  }
  return ra;
}
