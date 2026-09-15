/*
 * Mấy con số của PHÒNG CHAT CHUNG mỗi game.
 *
 * Tệp này KHÔNG import gì, để bài kiểm `.mjs` nạp thẳng được — Node không giải
 * được alias `@/`. Cùng lẽ với mấy tệp `*-const.ts` khác.
 */

/**
 * Một câu dài nhất bấy nhiêu chữ.
 *
 * Ngắn hơn hẳn một bài diễn đàn, và đó chính là ranh giới giữa hai chỗ: gõ tới
 * câu thứ tư thì thứ đang viết không còn là một câu nói trôi qua nữa, nó là
 * một bài — mà bài thì nên có tiêu đề và nằm lại trong một chủ đề.
 */
export const TIN_TOI_DA = 300;

/** Mỗi lượt đọc lấy bấy nhiêu câu mới nhất. */
export const LAY_MOI_LAN = 50;

/**
 * Hai câu liền nhau của CÙNG một người phải cách nhau bấy nhiêu giây.
 *
 * Không phải để chống người nói nhiều, mà để chống kịch bản: phòng chat là
 * đường ghi nhanh nhất vào cơ sở dữ liệu mà người lạ chạm được tới, nên không
 * có nhịp nghỉ thì một vòng lặp là đủ làm đầy bảng.
 */
export const NGHI_GIAY = 3;

/**
 * Bao lâu hỏi máy chủ một lần.
 *
 * Không có đường truyền hai chiều trong dự án này, nên chat chạy bằng cách hỏi
 * lại. Ba giây thì mượt mà tốn gấp ba; tám giây thì một cuộc nói chuyện vẫn
 * theo kịp nhau, vì người ta còn phải gõ. Và chỉ hỏi khi tab ĐANG MỞ — bỏ
 * quên một tab cả buổi mà vẫn gõ cửa máy chủ tám giây một lần là tốn suông.
 */
export const NHIP_MS = 8000;

/** Bao nhiêu bài mới nhất bày ở đầu diễn đàn. */
export const BAI_MOI = 5;
