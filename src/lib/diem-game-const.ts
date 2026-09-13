/*
 * ĐIỂM TRUNG BÌNH CỦA MỘT GAME — tính sẵn để còn xếp hạng theo được.
 *
 * VÌ SAO PHẢI CÓ CỘT RIÊNG: điểm trung bình là một phép CHIA, mà Prisma thì
 * không xếp theo phép chia. Bản trước lách bằng cách xếp theo số lượt đánh giá
 * rồi tới tổng sao, và gọi nó là "điểm cao nhất" — nhưng đó là "được chấm
 * nhiều nhất": một game trăm bài toàn 3 sao vẫn đứng trên một game mười bài
 * toàn 5 sao. Cái nhãn ấy nói sai về game của người khác, nên phải sửa chứ
 * không phải sống chung.
 *
 * NGƯỠNG PHIẾU NẰM NGAY TRONG CON SỐ, không để nơi gọi tự nhớ mà lọc.
 *
 * Chưa đủ phiếu thì điểm tính ra 0, nên game ấy tự chìm xuống đáy mọi bảng xếp
 * theo điểm — chứ không biến mất khỏi bảng. Khác biệt ấy quan trọng: lọc bỏ
 * hẳn thì game mới ra không bao giờ có cửa xuất hiện, còn để chìm thì đủ ba
 * người chấm là nó tự nổi lên.
 *
 * Ba phiếu là mức thấp nhất còn có nghĩa. Một game độc nhất một bài 5 sao mà
 * đứng đầu bảng "điểm cao nhất" thì cái bảng ấy chỉ nói rằng có người vừa chấm
 * sao, không nói game nào hay.
 *
 * Tệp này KHÔNG import gì để bài kiểm `.mjs` nạp thẳng được.
 */

/** Dưới ngần này phiếu thì chưa tính là có điểm. */
export const TOI_THIEU_PHIEU = 3;

/**
 * Điểm trung bình để LƯU VÀO `Game.diemTB`.
 *
 * Khác `diemSao` trong `tien-ich.ts`: hàm kia làm tròn một số lẻ để IN RA màn
 * hình, còn hàm này giữ nguyên số lẻ vì nó dùng để SẮP XẾP — làm tròn trước
 * khi sắp là ép cả chục game về cùng một hạng.
 */
export function tinhDiemTB(tongSao: number, soLuotDanhGia: number): number {
  if (soLuotDanhGia < TOI_THIEU_PHIEU) return 0;
  return tongSao / soLuotDanhGia;
}
