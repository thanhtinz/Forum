import type { Prisma } from '@prisma/client';
import { batBuocDangNhap, type NguoiDangNhap } from '@/lib/xac-thuc';

/*
 * AI ĐƯỢC SỬA MỘT GAME.
 *
 * Từ lúc có tác giả, mỗi hàm sửa game có HAI loại người gọi hợp lệ: ban quản
 * trị (sửa được mọi game) và chính tác giả của game ấy (chỉ game của mình).
 * Viết lại phép kiểm ấy ở từng hàm là cách chắc chắn để sót một chỗ — mà chỗ
 * sót ấy chính là lối để tác giả A sửa game của tác giả B.
 *
 * Nên gom vào đây, và gom theo lối TRẢ VỀ MỘT MẨU `where` chứ không trả về
 * true/false:
 *
 *   const { loc } = await quyenTrenGame(gameId);
 *   await db.game.update({ where: loc, ... });
 *
 * Khác biệt không nhỏ. Trả true/false thì nơi gọi đọc game lên, so chủ sở hữu,
 * rồi mới ghi — giữa hai bước ấy có một khe hở, và quan trọng hơn: quên mất
 * câu `if` là chuyện xảy ra được. Còn nếu điều kiện nằm trong `where` thì quên
 * nó đi là câu truy vấn không khớp hàng nào cả — hỏng về phía an toàn.
 */

export interface QuyenGame {
  nguoi: NguoiDangNhap;
  laQuanTri: boolean;
  /** Mẩu `where` cho chính bảng `Game`. */
  loc: Prisma.GameWhereUniqueInput;
  /** Mẩu `where` cho những bảng con trỏ về game — bản tải, ảnh chụp, tệp. */
  locQuaGame: Prisma.GameWhereInput;
}

/**
 * Ném lỗi nếu người gọi không có quyền đụng vào game này.
 *
 * Thành viên thường không có cửa: họ không sở hữu game nào, nên `tacGiaId`
 * khớp với id của họ là chuyện không xảy ra — nhưng vẫn chặn thẳng ở đây cho
 * câu báo lỗi nói đúng chuyện, thay vì để truy vấn trả về "không tìm thấy".
 */
export async function quyenTrenGame(gameId: string): Promise<QuyenGame> {
  const nguoi = await batBuocDangNhap();
  const laQuanTri = nguoi.vaiTro === 'QUAN_TRI';

  if (!laQuanTri && nguoi.vaiTro !== 'TAC_GIA') {
    throw new Error('Chỉ tác giả của game hoặc ban quản trị làm được việc này.');
  }

  return {
    nguoi,
    laQuanTri,
    loc: laQuanTri ? { id: gameId } : { id: gameId, tacGiaId: nguoi.id },
    locQuaGame: laQuanTri ? { id: gameId } : { id: gameId, tacGiaId: nguoi.id },
  };
}

/**
 * Mẩu `where` lọc "game mà người này được sửa", dùng cho mấy bảng CON.
 *
 * Bản tải, tệp và ảnh chụp không mang chủ sở hữu — game của chúng mới mang.
 * Nên thay vì đọc game lên rồi so, lọc luôn qua quan hệ trong cùng một câu:
 *
 *   db.banTai.findFirst({ where: { id, game: locGameCuaToi(nguoi) } })
 *
 * Ban quản trị nhận lại một điều kiện RỖNG, tức là không lọc gì — họ sửa được
 * mọi game.
 */
export function locGameCuaToi(nguoi: NguoiDangNhap): Prisma.GameWhereInput {
  return nguoi.vaiTro === 'QUAN_TRI' ? {} : { tacGiaId: nguoi.id };
}

/** Câu báo chung khi truy vấn không khớp hàng nào — cố ý KHÔNG nói game có tồn tại hay không. */
export const LOI_KHONG_QUYEN =
  'Không tìm thấy game này, hoặc nó không phải của bạn.';
