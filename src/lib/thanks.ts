/**
 * Kiểu và hằng số cho nút "Cảm ơn".
 *
 * Để riêng khỏi tệp server action: tệp có `'use server'` chỉ được xuất ra hàm
 * bất đồng bộ, xuất một hằng số thôi là cả tệp không biên dịch nổi.
 */

export interface ThanksState {
  active: boolean;
  /** Tên hiện của những người đã cảm ơn, mới nhất trước. */
  people: string[];
  count: number;
  error?: string;
}

/** Chỉ liệt kê ngần này cái tên, còn lại gộp thành "và N người khác". */
export const THANKS_NAMES_SHOWN = 12;

/** Mức tặng nhanh, để khỏi phải gõ số. */
export const DONATE_QUICK = [5, 10, 20, 50] as const;
export const DONATE_MIN = 1;
/** Trần mỗi lần tặng — chặn tay trượt và chặn cả người cố tình dốc sạch ví. */
export const DONATE_MAX = 1000;

export interface DonateState {
  ok?: boolean;
  error?: string;
  /** Tổng điểm đã tặng cho bài này sau khi tặng xong. */
  total?: number;
  /** Số điểm còn lại của người tặng. */
  left?: number;
}
