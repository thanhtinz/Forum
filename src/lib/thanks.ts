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
