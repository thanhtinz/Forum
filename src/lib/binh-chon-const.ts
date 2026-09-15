/*
 * BÌNH CHỌN TRONG MỘT CHỦ ĐỀ — mấy con số và phép tính thuần.
 *
 * Tệp này KHÔNG import gì, để mấy bài kiểm `.mjs` nạp thẳng được.
 */

/** Câu hỏi dài nhất. */
export const CAU_HOI_TOI_DA = 150;

/** Một lựa chọn dài nhất. */
export const LUA_CHON_TOI_DA = 80;

/*
 * Ít nhất hai lựa chọn — một cuộc bình chọn một đáp án thì không phải bình
 * chọn, nó là một câu khẳng định có nút bấm.
 */
export const IT_NHAT = 2;

/*
 * Nhiều nhất sáu.
 *
 * Không phải giới hạn kỹ thuật mà là giới hạn đọc: quá sáu dòng thì người xem
 * không còn so được các lựa chọn với nhau nữa, họ chỉ bấm cái đầu tiên thấy
 * hợp lý. Ai cần hơn sáu thì câu hỏi ấy nên tách làm hai.
 */
export const NHIEU_NHAT = 6;

/**
 * Phần trăm phiếu của một lựa chọn.
 *
 * Chia cho TỔNG SỐ PHIẾU chứ không chia cho số người bỏ phiếu: với cuộc cho
 * chọn nhiều đáp án, một người bấm ba ô là ba phiếu, và mấy thanh cộng lại
 * phải ra đúng 100% thì người đọc mới so được chúng với nhau.
 *
 * Tổng bằng 0 thì trả 0 — không chia cho không, và một cuộc chưa ai bấm thì
 * mọi thanh đều phải trống.
 */
export function phanTram(soPhieu: number, tong: number): number {
  if (tong <= 0) return 0;
  return Math.round((soPhieu / tong) * 100);
}
