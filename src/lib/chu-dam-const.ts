/**
 * Gỡ hết ký hiệu Markdown, chỉ còn chữ trần.
 *
 * Dùng cho thẻ mô tả của trang và cho mấy chỗ cắt ngắn: in `**Bóng đỏ**` vào
 * kết quả tìm kiếm của Google thì hai dấu sao ấy hiện nguyên trên đó.
 *
 * Tệp này KHÔNG import gì, đúng lối mấy tệp `*-const.ts` khác: bài kiểm `.mjs`
 * nạp thẳng được mà không kéo theo cả bộ dựng Markdown.
 */
export function bocChu(chu: string | null | undefined): string {
  return (chu ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+[.)]\s+/gm, '')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '$1')
    .replace(/__([^_]*)__/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
