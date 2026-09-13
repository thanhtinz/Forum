/*
 * MỐC NGÀY THEO GIỜ VIỆT NAM.
 *
 * Máy chủ chạy giờ UTC, mà người đọc số liệu thì sống ở Việt Nam. Gom lượt tải
 * theo ngày UTC nghĩa là mọi lượt tải từ 0 giờ tới 7 giờ sáng giờ ta bị tính
 * sang HÔM QUA — mà đó lại là khung giờ người ta ôm điện thoại trước khi ngủ.
 * Cái cột "hôm nay" trên biểu đồ vì thế lúc nào cũng hụt một mẩu, và không ai
 * đoán ra vì sao.
 *
 * Cộng cứng bảy tiếng chứ không gọi thư viện múi giờ: Việt Nam không đổi giờ
 * theo mùa, chưa bao giờ đổi, nên một con số cố định ở đây là ĐÚNG chứ không
 * phải là đi tắt.
 *
 * Tệp này KHÔNG import gì để bài kiểm `.mjs` nạp thẳng được.
 */

/** Việt Nam đi trước UTC bảy tiếng, quanh năm. */
export const LECH_VN_PHUT = 7 * 60;

const MOT_PHUT = 60_000;

/**
 * Mốc 0 giờ (giờ Việt Nam) của cái ngày chứa `luc`, trả về dưới dạng thời điểm
 * thật — tức là 17:00 UTC của hôm trước.
 *
 * Dùng làm KHOÁ gom nhóm, nên nó phải là một thời điểm chứ không phải một
 * chuỗi: hai máy đọc chuỗi "2026-09-13" ra hai thời điểm khác nhau tuỳ múi giờ
 * của chúng, còn thời điểm thì chỉ có một.
 */
export function dauNgayVN(luc: Date = new Date()): Date {
  const theoVN = new Date(luc.getTime() + LECH_VN_PHUT * MOT_PHUT);
  theoVN.setUTCHours(0, 0, 0, 0);
  return new Date(theoVN.getTime() - LECH_VN_PHUT * MOT_PHUT);
}

/** Lùi `soNgay` ngày so với đầu ngày hôm nay. */
export function dauNgayTruoc(soNgay: number, luc: Date = new Date()): Date {
  return dauNgayVN(new Date(luc.getTime() - soNgay * 24 * 60 * MOT_PHUT));
}

/** "13/9" — nhãn ngắn cho trục ngang của biểu đồ. */
export function nhanNgayVN(luc: Date): string {
  const theoVN = new Date(luc.getTime() + LECH_VN_PHUT * MOT_PHUT);
  return `${theoVN.getUTCDate()}/${theoVN.getUTCMonth() + 1}`;
}
