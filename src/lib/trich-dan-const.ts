/*
 * TRÍCH MỘT MẨU BÀI ĐỂ NHẮC LẠI.
 *
 * Tệp này KHÔNG import gì, để mấy bài kiểm `.mjs` nạp thẳng được.
 */

/** Mẩu trích dài nhất in kèm một bài đáp. */
export const TRICH_TOI_DA = 140;

/**
 * Rút một bài viết thành một dòng đọc lướt được.
 *
 * Bỏ hẳn dấu Markdown thay vì dựng lại chữ đậm: mẩu trích này chỉ để NHẬN RA
 * bài nào, không phải để đọc lại. Giữ nguyên cú pháp thì một mẩu trích ảnh
 * thành `![](https://…)` dài ngoằng, chiếm hết chỗ mà chẳng nói gì.
 */
export function rutGon(chu: string | null | undefined, toiDa = TRICH_TOI_DA): string {
  const tho = String(chu ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '[ảnh]')     // ảnh → một chữ gọn
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')        // liên kết → giữ phần chữ
    .replace(/^>\s?/gm, '')                         // dấu trích dẫn cũ
    .replace(/[*_`~#]/g, '')                        // đậm, nghiêng, mã, đầu đề
    .replace(/\s+/g, ' ')
    .trim();

  return tho.length > toiDa ? `${tho.slice(0, toiDa - 1).trimEnd()}…` : tho;
}
