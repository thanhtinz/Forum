import { db } from '@/lib/db';
import type { MaDem } from '@/lib/quan-tri-loi-di';

/**
 * Đếm việc TỒN ĐỌNG cho huy hiệu trên thanh bên.
 *
 * Gom vào một hàm vì cả khung lẫn trang tổng quan đều cần đúng bộ số này —
 * hai chỗ tự đếm lấy thì sớm muộn một bên đổi điều kiện mà bên kia không, rồi
 * huy hiệu ghi 3 còn danh sách bày ra 5.
 *
 * "Đánh giá chưa đáp" chỉ tính bài CÓ LỜI VIẾT. Bài chấm sao suông thì không
 * có gì để trả lời, mà đếm nó vào thì huy hiệu lúc nào cũng đỏ và người ta
 * học được cách phớt lờ nó — huy hiệu không bao giờ về không là huy hiệu chết.
 */
export async function demViecTonDong(): Promise<Record<MaDem, number>> {
  const [yeuCauCho, gameNhap, danhGiaChuaDap, baoXauCho, choDuyet, donTacGiaCho] = await Promise.all([
    db.yeuCau.count({ where: { trangThai: 'CHO_XEM' } }),
    db.game.count({ where: { trangThai: 'NHAP' } }),
    db.danhGia.count({ where: { noiDung: { not: null }, traLoi: null } }),
    db.baoXau.count({ where: { trangThai: 'CHO_XEM' } }),
    // Game của tác giả đang đợi xem xét — con số duy nhất ở đây mà người
    // NGOÀI cửa hàng đang chờ, nên nó đáng nằm trên thanh bên nhất.
    db.game.count({ where: { trangThai: 'CHO_DUYET' } }),
    // Người xin làm tác giả đang đợi trả lời. Cũng là người ngoài đang chờ, mà
    // chờ ở đúng cái cửa đầu tiên — không trả lời thì họ bỏ đi luôn.
    db.donTacGia.count({ where: { trangThai: 'CHO_XEM' } }),
  ]);
  return { yeuCauCho, gameNhap, danhGiaChuaDap, baoXauCho, choDuyet, donTacGiaCho };
}
