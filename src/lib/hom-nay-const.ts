/**
 * Chọn game cho tab "Hôm nay".
 *
 * TỆP NÀY KHÔNG IMPORT GÌ. Nó là phép tính thuần, không đụng CSDL, và có một
 * kịch bản soát chạy thẳng vào nó (`scripts/soat-vong-hom-nay.ts`) để duyệt
 * hàng trăm ngày liền mà không cần dựng máy chủ.
 *
 * BA ĐIỀU PHẢI ĐÚNG CÙNG LÚC
 *
 *   1. Mỗi ngày một bộ khác — không thì tab này chỉ là một cái kệ đứng yên.
 *   2. KHÔNG TRÙNG cho tới khi đi hết danh mục. Bốc ngẫu nhiên thật thì hôm nay ra
 *      Contra, mai lại Contra, mà nửa số game trong kho không bao giờ được
 *      bày. Nghịch lý sinh nhật: kho hai trăm game, bốc bốn con mỗi ngày, thì
 *      chỉ hơn tháng là gặp trùng.
 *   3. Ai mở cũng thấy y hệt nhau, và tải lại trang không đổi. `Math.random()`
 *      hỏng cả hai: mỗi lượt tải một kết quả, mỗi người một kết quả.
 *
 * CÁCH LÀM: XÁO CẢ CỖ RỒI CHIA DẦN
 *
 * Coi cả kho là một cỗ bài. Đầu mỗi VÒNG thì xáo cỗ ấy một lần, rồi mỗi ngày
 * chia ra vài lá theo đúng thứ tự đã xáo. Đi hết cỗ là hết một vòng, xáo lại
 * bằng một hạt giống khác rồi chia tiếp.
 *
 * Nhờ vậy "không trùng" là điều KHÔNG THỂ SAI được, chứ không phải một điều
 * kiện phải đi kiểm sau: trong một vòng, mỗi lá bài đi qua tay đúng một lần.
 */

/**
 * Bộ sinh số giả ngẫu nhiên mulberry32.
 *
 * Cần một bộ sinh CÓ HẠT GIỐNG, mà `Math.random()` thì không nhận hạt giống.
 * Mulberry32 gọn (bốn dòng), phân bố đủ đều cho việc xáo bài, và quan trọng
 * nhất: cùng một hạt giống thì ở máy nào, lần chạy nào cũng ra đúng một dãy.
 */
function boSinh(hatGiong: number): () => number {
  let a = hatGiong >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Xáo một danh sách theo hạt giống, KHÔNG đụng vào danh sách gốc.
 *
 * Fisher–Yates duyệt ngược. Đừng thay bằng `sort(() => rd() - 0.5)` — cách ấy
 * cho ra phân bố lệch hẳn (mấy phần tử đầu hay ở lại chỗ cũ) và tuỳ thuộc vào
 * thuật toán sắp xếp của từng trình duyệt.
 */
export function xaoTheoHat<T>(danhSach: readonly T[], hatGiong: number): T[] {
  const ra = [...danhSach];
  const rd = boSinh(hatGiong);
  for (let i = ra.length - 1; i > 0; i--) {
    const j = Math.floor(rd() * (i + 1));
    [ra[i], ra[j]] = [ra[j], ra[i]];
  }
  return ra;
}

/**
 * Hôm nay là ngày thứ mấy, tính theo giờ Việt Nam.
 *
 * Cộng bảy tiếng rồi mới chia: nếu chia theo giờ UTC thì "hôm nay" đổi lúc 7
 * giờ sáng giờ Việt Nam — người mở trang lúc 6 giờ sáng vẫn thấy game của hôm
 * qua, mà đúng 7 giờ thì nó nhảy sang bộ mới ngay trước mắt.
 */
export function soNgay(luc: Date = new Date()): number {
  return Math.floor((luc.getTime() + 7 * 3600 * 1000) / 86_400_000);
}

export interface ChiaHomNay<T> {
  /** Những lá được chia cho hôm nay, đúng thứ tự đã xáo. */
  chon: T[];
  /** Vòng thứ mấy — dùng cho bài kiểm và cho kịch bản soát. */
  vong: number;
  /** Hôm nay là ngày thứ mấy TRONG vòng, đếm từ 0. */
  ngayTrongVong: number;
  /** Một vòng dài bao nhiêu ngày. */
  soNgayMotVong: number;
}

/**
 * Chia phần của một ngày.
 *
 * `tatCa` phải đã được sắp theo một thứ tự ỔN ĐỊNH trước khi truyền vào (sắp
 * theo id là đủ). Truyền vào một thứ tự khác nhau giữa hai lần gọi thì cùng
 * một ngày lại ra hai kết quả — đúng thứ mà cả hàm này sinh ra để tránh.
 */
export function chiaHomNay<T>(
  tatCa: readonly T[],
  moiNgay: number,
  ngay: number = soNgay(),
): ChiaHomNay<T> {
  if (tatCa.length === 0 || moiNgay <= 0) {
    return { chon: [], vong: 0, ngayTrongVong: 0, soNgayMotVong: 0 };
  }

  const soNgayMotVong = Math.ceil(tatCa.length / moiNgay);
  // `((n % m) + m) % m` chứ không phải `n % m`: JavaScript cho phép số dư âm,
  // mà ngày trước mốc 1970 thì `ngay` âm — chỉ số âm là mảng rỗng.
  const vong = Math.floor(ngay / soNgayMotVong);
  const ngayTrongVong = ((ngay % soNgayMotVong) + soNgayMotVong) % soNgayMotVong;

  const daXao = xaoTheoHat(tatCa, vong * 2654435761 + 1);
  const tu = ngayTrongVong * moiNgay;

  return { chon: daXao.slice(tu, tu + moiNgay), vong, ngayTrongVong, soNgayMotVong };
}
