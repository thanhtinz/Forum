/**
 * Trắc nghiệm — hằng số và luật, dùng chung cho máy chủ lẫn trình duyệt.
 *
 * Dựng lại từ `quiz.php` của bộ mod JohnCMS Việt hoá cũ. Giữ nguyên luật:
 * thành viên tự ra câu hỏi bốn phương án, ĐẶT CỌC một khoản, ai trả lời đúng
 * thì ăn đúng khoản ấy của người ra câu, trả lời sai thì mất đúng khoản ấy cho
 * người ra câu. Chỉ ĐỔI ĐƠN VỊ: bản cũ tính bằng "xu", ở đây tính bằng "điểm".
 *
 * Tách riêng khỏi `quiz.ts` vì tệp kia đụng Prisma — kéo Prisma vào gói trình
 * duyệt là hỏng cả bản dựng.
 */

/** Số phương án của một câu hỏi. Bản gốc cố định bốn, giữ nguyên. */
export const QUIZ_SO_PHUONG_AN = 4;

/** Khoảng đặt cọc cho một câu hỏi, cũng là số điểm ăn thua mỗi lượt trả lời. */
export const QUIZ_COC_MIN = 10;
export const QUIZ_COC_MAX = 50;

/**
 * Phải có ít nhất bấy nhiêu bài trên diễn đàn mới được ra câu hỏi.
 *
 * Đếm cả chủ đề lẫn trả lời. Bản gốc chặn người lạ vừa đăng ký đã ra câu đánh
 * đố rồi ôm điểm bỏ đi; ở đây giữ đúng ý ấy.
 */
export const QUIZ_BAI_TOI_THIEU = 5;

/**
 * Trần số câu ĐANG CHỜ DUYỆT của một người.
 *
 * Bản gốc không có; thêm vào để một người không thả năm chục câu rác vào hàng
 * chờ, quản trị soi không xuể. Đã duyệt rồi thì ra câu tiếp thoải mái.
 */
export const QUIZ_CHO_DUYET_TOI_DA = 3;

/** Giới hạn độ dài, tính bằng ký tự. */
export const QUIZ_NOI_DUNG_MIN = 10;
export const QUIZ_NOI_DUNG_MAX = 500;
export const QUIZ_PHUONG_AN_MAX = 120;
export const QUIZ_GIAI_THICH_MAX = 500;

/** Số câu hỏi hiện mỗi trang. */
export const QUIZ_MOI_TRANG = 10;

/** Nhãn A, B, C, D cho từng phương án. */
export const QUIZ_NHAN = ['A', 'B', 'C', 'D'] as const;

export const QUIZ_TRANG_THAI_LABEL = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đang hiện',
  REJECTED: 'Bị từ chối',
} as const;

/**
 * Kiểm nội dung một câu hỏi, trả về câu lỗi hoặc `null` nếu sạch.
 *
 * Để ở đây để trang đăng câu hỏi và server action dùng CHUNG một bộ luật —
 * viết hai lần là kiểu gì cũng lệch nhau.
 */
export function loiCauHoi(
  noiDung: string,
  phuongAn: string[],
  dapAn: number,
  giaiThich: string,
  coc: number,
): string | null {
  const nd = noiDung.trim();
  if (nd.length < QUIZ_NOI_DUNG_MIN) return `Câu hỏi phải dài ít nhất ${QUIZ_NOI_DUNG_MIN} ký tự.`;
  if (nd.length > QUIZ_NOI_DUNG_MAX) return `Câu hỏi dài quá ${QUIZ_NOI_DUNG_MAX} ký tự.`;

  if (phuongAn.length !== QUIZ_SO_PHUONG_AN) return `Phải đủ ${QUIZ_SO_PHUONG_AN} phương án.`;
  const pa = phuongAn.map((p) => p.trim());
  if (pa.some((p) => p.length === 0)) return 'Không được bỏ trống phương án nào.';
  if (pa.some((p) => p.length > QUIZ_PHUONG_AN_MAX)) {
    return `Mỗi phương án tối đa ${QUIZ_PHUONG_AN_MAX} ký tự.`;
  }
  // Hai phương án trùng chữ thì câu hỏi có hai đáp án đúng, hoặc người trả lời
  // không biết chọn ô nào — kiểu gì cũng là câu hỏi hỏng.
  if (new Set(pa.map((p) => p.toLowerCase())).size !== pa.length) {
    return 'Bốn phương án phải khác nhau.';
  }

  if (!Number.isInteger(dapAn) || dapAn < 0 || dapAn >= QUIZ_SO_PHUONG_AN) {
    return 'Hãy chọn một phương án làm đáp án đúng.';
  }
  if (giaiThich.trim().length > QUIZ_GIAI_THICH_MAX) {
    return `Lời giải thích tối đa ${QUIZ_GIAI_THICH_MAX} ký tự.`;
  }
  if (!Number.isInteger(coc) || coc < QUIZ_COC_MIN || coc > QUIZ_COC_MAX) {
    return `Đặt cọc từ ${QUIZ_COC_MIN} đến ${QUIZ_COC_MAX} điểm.`;
  }
  return null;
}
