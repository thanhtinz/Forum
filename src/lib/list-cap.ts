/**
 * Trần cứng cho những danh sách không phân trang.
 *
 * Các bảng cấu hình (chuyên mục, box diễn đàn, thể loại game, mục điều
 * hướng…) chỉ dài ra khi quản trị viên tự thêm, nên thực tế chúng ở mức vài
 * chục hàng và phân trang chỉ tổ vướng. Nhưng "thực tế" không phải là một
 * ràng buộc: một vòng lặp nhập liệu hỏng hay một lần nhập hàng loạt là bảng
 * phình lên, và trang đang dựng cả bảng ra sẽ gục mà chẳng ai sửa gì cả.
 *
 * Trần này là cái phanh cuối: đủ rộng để không bao giờ chạm tới khi dùng bình
 * thường, đủ chặt để một bảng chạy loạn không kéo sập trang.
 */
export const CONFIG_LIST_CAP = 500;

/**
 * Trần cho những danh sách phụ trợ gắn với MỘT bản ghi — ảnh của một game,
 * phiên bản của một game, tệp tải của một bài. Nhỏ hơn hẳn vì đây là dữ liệu
 * của một mục chứ không phải của cả trang web.
 */
export const ITEM_LIST_CAP = 200;
