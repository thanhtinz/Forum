/*
 * Mấy con số của bảng "Người tích cực nhất" trong diễn đàn từng game.
 *
 * Tệp này KHÔNG import gì, để bài kiểm `.mjs` nạp thẳng được — Node không giải
 * được alias `@/`. Cùng lẽ với mấy tệp `*-const.ts` khác trong dự án.
 */

/** Bày nhiều nhất bấy nhiêu người. */
export const TOP = 5;

/**
 * Ít hơn bấy nhiêu bài thì chưa gọi là tích cực.
 *
 * Không có mốc này thì diễn đàn vừa mở, một người đăng đúng một chủ đề, đã
 * thành "người tích cực nhất" — một bảng vinh danh có đúng một người và một
 * con số 1 thì nói dối về chỗ này đông vui hơn thực tế.
 */
export const IT_NHAT = 3;
