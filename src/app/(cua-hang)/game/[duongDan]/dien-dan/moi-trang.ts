/*
 * Mỗi trang chủ đề chứa bao nhiêu trả lời.
 *
 * Để riêng một tệp vì hai nơi cần cùng một con số: trang chủ đề dùng nó để
 * cắt trang, còn hàm `traLoi` dùng nó để tính xem bài vừa gửi rơi vào trang
 * mấy mà đưa người viết tới đó. Không nhét được vào `viec.ts` — tệp ấy mang
 * `'use server'`, nơi mọi thứ export ra buộc phải là hàm bất đồng bộ.
 *
 * Trước đây trang chủ đề lấy `take: 200` rồi thôi: chủ đề nào bàn dài hơn thế
 * thì trả lời thứ 201 không ai đọc được nữa, mà người viết vẫn thấy bài mình
 * gửi đi trót lọt.
 */
export const MOI_TRANG_TRA_LOI = 30;
