/*
 * TÓM TẮT ĐÁNH GIÁ — vài dòng dựng từ chính những bài người ta đã viết.
 *
 * App Store để một đoạn "Review Summary" ngay dưới điểm trung bình, và nó giải
 * đúng bài toán của một cửa hàng: con số "4,2" không nói được người ta khen cái
 * gì và chê cái gì, mà đọc hai chục bài thì chẳng ai đọc.
 *
 * Ở đây tóm tắt dựng bằng ĐẾM, không bằng máy nghĩ hộ. Cửa hàng này không gọi
 * mô hình ngôn ngữ nào, mà kể cả có thì một đoạn văn máy tự bịa nằm cạnh lời
 * thật của người chơi là thứ không kiểm chứng được — cửa hàng nói sai về game
 * của người khác là chuyện nặng. Nên mọi câu ở đây đều quy về số đếm có thật:
 * bao nhiêu bài chấm mấy sao, chữ nào lặp lại ở nhiều bài.
 *
 * TỆP NÀY KHÔNG IMPORT GÌ, cố ý — y như mấy tệp `*-const.ts`. Bài kiểm `.mjs`
 * nạp thẳng nó để chấm lại phép đếm mà không phải dựng cả trang, mà Node thì
 * không giải được lối viết tắt `@/`.
 *
 * Chữ nào lặp lại thì đếm theo CẶP ÂM TIẾT chứ không theo từng tiếng. Tiếng
 * Việt viết rời từng âm tiết, nên đếm rời ra chỉ được "đồ", "hoạ", "mượt" —
 * "đồ" một mình thì chẳng nói lên gì. Cặp liền nhau mới ra "đồ hoạ", "cấu
 * hình", "máy yếu", tức là thứ người đọc muốn biết.
 */

/** Số bài tối thiểu mới tóm tắt: dưới ngần này thì đọc thẳng còn nhanh hơn. */
export const TOI_THIEU_TOM_TAT = 4;

/**
 * Tiếng đệm — đầy ở mọi bài nên không phân biệt được game này với game khác.
 *
 * Gồm cả mấy tiếng khen chê chung chung ("hay", "tốt", "tệ") vì phần khen chê
 * đã có câu về phân bố sao nói rồi; nhắc lại ở hàng từ khoá chỉ tốn chỗ.
 */
const TIENG_DEM = new Set([
  'và', 'với', 'của', 'là', 'có', 'không', 'thì', 'mà', 'nhưng', 'nên', 'cho',
  'được', 'bị', 'đã', 'đang', 'sẽ', 'này', 'kia', 'đó', 'ấy', 'ở', 'tại',
  'trong', 'ngoài', 'trên', 'dưới', 'ra', 'vào', 'lên', 'xuống', 'về', 'tới',
  'đến', 'từ', 'khi', 'lúc', 'nếu', 'vì', 'do', 'bởi', 'nữa', 'rồi', 'chưa',
  'cũng', 'vẫn', 'rất', 'quá', 'lắm', 'hơi', 'khá', 'thật', 'chỉ', 'mỗi',
  'các', 'những', 'một', 'hai', 'nhiều', 'ít', 'mọi', 'cả', 'tất', 'gì',
  'ai', 'sao', 'thế', 'vậy', 'nào', 'đâu', 'bao', 'giờ', 'tôi', 'mình',
  'bạn', 'em', 'anh', 'chị', 'nó', 'họ', 'người', 'ta', 'chúng', 'hơn',
  'như', 'cùng', 'theo', 'để', 'bằng', 'hay', 'tốt', 'tệ', 'ổn', 'ok',
  'game', 'chơi', 'thấy', 'nghĩ', 'muốn', 'cần', 'phải', 'làm', 'đi',
  'nha', 'nhé', 'ạ', 'à', 'ừ', 'ừm', 'thôi', 'luôn', 'đây', 'nay',
]);

/** Cắt một bài thành dãy âm tiết sạch, bỏ dấu câu và số. */
function catTieng(chu: string): string[] {
  return chu
    .toLowerCase()
    // Giữ chữ cái Unicode (tiếng Việt có dấu) và khoảng trắng, còn lại thành
    // khoảng trắng — dấu câu dính vào tiếng cuối câu thì "mượt." và "mượt"
    // đếm thành hai thứ khác nhau.
    .replace(/[^\p{L}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Mấy cụm được nhắc tới ở nhiều bài nhất.
 *
 * Đếm theo SỐ BÀI có nhắc, không theo số lần xuất hiện: một người viết "lag"
 * mười lần vẫn chỉ là một người thấy lag, mà đếm theo lần thì bài dài nhất
 * quyết định luôn hàng từ khoá.
 */
export function cumHayNhac(loiBinh: string[], soCum = 3): string[] {
  if (loiBinh.length < TOI_THIEU_TOM_TAT) return [];

  const demCap = new Map<string, number>();
  const demLe = new Map<string, number>();

  for (const bai of loiBinh) {
    const tieng = catTieng(bai);
    // Một bài đếm một lần cho mỗi cụm, nên gom vào tập trước rồi mới cộng.
    const capTrongBai = new Set<string>();
    const leTrongBai = new Set<string>();

    for (let i = 0; i < tieng.length; i++) {
      const a = tieng[i];
      if (TIENG_DEM.has(a)) continue;
      if (a.length >= 3) leTrongBai.add(a);
      const b = tieng[i + 1];
      if (b && !TIENG_DEM.has(b)) capTrongBai.add(`${a} ${b}`);
    }

    for (const c of capTrongBai) demCap.set(c, (demCap.get(c) ?? 0) + 1);
    for (const t of leTrongBai) demLe.set(t, (demLe.get(t) ?? 0) + 1);
  }

  // Phải có ít nhất hai người cùng nhắc mới gọi là "hay được nhắc"; một người
  // nói một câu thì đó là bài đánh giá của người ấy, không phải xu hướng.
  const loc = (m: Map<string, number>) =>
    [...m.entries()]
      .filter(([, n]) => n >= 2)
      // Khoá phụ là chính cụm chữ: hai cụm bằng điểm mà xếp theo thứ tự Map thì
      // cùng một dữ liệu có thể ra hai kết quả khác nhau giữa hai lần dựng trang.
      .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'vi'));

  const chon: string[] = [];
  for (const [cum] of loc(demCap)) {
    if (chon.length >= soCum) break;
    chon.push(cum);
  }
  // Thiếu thì bù bằng tiếng lẻ, nhưng bỏ tiếng đã nằm trong cụm đã chọn —
  // "đồ hoạ" rồi lại "hoạ" là kể hai lần cùng một chuyện.
  if (chon.length < soCum) {
    const daCo = new Set(chon.flatMap((c) => c.split(' ')));
    for (const [tieng] of loc(demLe)) {
      if (chon.length >= soCum) break;
      if (daCo.has(tieng)) continue;
      chon.push(tieng);
    }
  }
  return chon;
}

/**
 * Cả đoạn tóm tắt. `null` nghĩa là chưa đủ bài để nói gì cho ra hồn — nơi gọi
 * cứ ẩn hẳn mục đi chứ đừng in một đoạn rỗng.
 */
export function tomTatDanhGia(
  phanBo: Record<number, number>,
  loiBinh: string[],
): string | null {
  const tong = [1, 2, 3, 4, 5].reduce((s, n) => s + (phanBo[n] ?? 0), 0);
  if (tong < TOI_THIEU_TOM_TAT) return null;

  const khen = (phanBo[5] ?? 0) + (phanBo[4] ?? 0);
  const che = (phanBo[1] ?? 0) + (phanBo[2] ?? 0);
  const cau: string[] = [];

  if (khen / tong >= 0.7) {
    cau.push(`Phần lớn người chơi hài lòng: ${khen} trong ${tong} bài chấm từ 4 sao trở lên.`);
  } else if (che / tong >= 0.5) {
    cau.push(`Phần đông chưa hài lòng: ${che} trong ${tong} bài chỉ chấm 1 hoặc 2 sao.`);
  } else if (khen / tong >= 0.3 && che / tong >= 0.3) {
    cau.push(`Ý kiến chia hai chiều rõ rệt: ${khen} bài khen từ 4 sao, ${che} bài chê ở mức 1–2 sao.`);
  } else {
    cau.push(`Điểm rải đều quanh mức giữa: ${phanBo[3] ?? 0} trong ${tong} bài dừng ở 3 sao.`);
  }

  const cum = cumHayNhac(loiBinh);
  if (cum.length > 0) {
    cau.push(`Chỗ được nhắc tới nhiều nhất: ${cum.join(', ')}.`);
  }

  const soViet = loiBinh.length;
  if (soViet > 0 && soViet < tong) {
    cau.push(`${soViet} người viết thêm vài dòng, còn lại chấm sao suông.`);
  }

  return cau.join(' ');
}
