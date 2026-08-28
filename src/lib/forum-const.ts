/**
 * Hằng số của diễn đàn dùng chung cho cả máy chủ lẫn giao diện.
 *
 * Tách khỏi `forum/actions.ts` vì tệp ấy mang `'use server'` — ở đó chỉ được
 * export hàm bất đồng bộ, mọi export khác đều là lỗi lúc dựng bản.
 */

/**
 * Trần độ dài bài chủ đề.
 *
 * Trả lời có trần 5000, bình luận game 2000, bình luận câu lạc bộ 500 — riêng
 * bài chủ đề thì trước đây không có trần nào, dù nó là thứ dài nhất và được lưu
 * HAI bản (`content` đã dựng HTML và `contentSource` mã gốc).
 */
export const THREAD_CONTENT_MAX = 20000;

/** Câu báo lỗi dùng chung, để ô soạn và máy chủ nói cùng một con số. */
export const THREAD_CONTENT_MAX_MESSAGE =
  `Nội dung tối đa ${THREAD_CONTENT_MAX.toLocaleString('vi-VN')} ký tự.`;
