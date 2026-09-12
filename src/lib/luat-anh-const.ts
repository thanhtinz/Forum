/*
 * LUẬT VỀ ẢNH CỦA CỬA HÀNG.
 *
 * Chép theo hướng dẫn tài sản của App Store — thứ Apple đúc ra sau mười mấy
 * năm nhìn hàng triệu trang sản phẩm, nên không có lý gì tự nghĩ lại từ đầu:
 *
 *   • "You can have up to 10 screenshots on your product page."
 *   • "Depending on orientation, up to three screenshots can appear in search
 *     results." — tức là BA TẤM ĐẦU quan trọng hơn hẳn bảy tấm sau, và người
 *     bày hàng phải biết điều ấy lúc xếp thứ tự.
 *   • "Ensure your icon is legible at every size across Apple devices."
 *
 * Câu cuối là câu duy nhất kiểm được bằng máy: đọc được ở mọi cỡ thì trước hết
 * phải ĐỦ ĐIỂM ẢNH. Cửa hàng này bày biểu tượng to nhất ở 104 điểm ảnh, mà màn
 * hình điện thoại nào cũng nhân đôi nhân ba — nên 256 là sàn, dưới sàn ấy là
 * nhoè, và một biểu tượng nhoè thì đứng cạnh mấy biểu tượng sắc nét trông như
 * hàng giả.
 *
 * Tệp này KHÔNG import gì: mấy bài kiểm `.mjs` nạp thẳng nó để so cùng một con
 * số với máy chủ, thay vì chép lại rồi có ngày hai bên lệch nhau.
 */

/** Trần ảnh chụp một game. */
export const TOI_DA_ANH_CHUP = 10;

/** Bao nhiêu tấm đầu được bày ở kết quả tìm. */
export const ANH_TRONG_KET_QUA = 3;

/** Cạnh nhỏ nhất của biểu tượng, tính bằng điểm ảnh. Biểu tượng phải VUÔNG. */
export const ICON_TOI_THIEU = 256;

/** Cạnh nhỏ nhất của một ảnh chụp màn hình. */
export const ANH_CHUP_TOI_THIEU = 320;
