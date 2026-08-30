/**
 * Khu giải trí — hằng số và quy ước, dùng chung cho máy chủ lẫn giao diện.
 *
 * Dựng lại từ bộ mod JohnCMS Việt hoá quãng 2008–2011: giữ nguyên luật chơi,
 * giữ nguyên tỉ lệ, giữ luôn bộ ảnh gốc. Chỉ ĐỔI ĐƠN VỊ: bản cũ tính bằng "xu"
 * với hộp quà 5.000 xu mỗi ngày, còn ở đây một chủ đề mới được 10 điểm — nên
 * mọi con số chia 100 rồi làm tròn cho dễ nhớ. Tỉ lệ ăn thua thì y hệt bản cũ.
 */

/** Đường dẫn gốc của bộ ảnh cũ giữ lại. */
export const ANH = '/hoai-niem';

// ─────────────────────────── Bầu cua tôm cá ───────────────────────────

/**
 * Sáu con trên mâm, đặt tên theo ĐÚNG hình trong ảnh gốc `baucua/1..6.gif` —
 * đã mở từng tệp ra xem chứ không đoán theo thứ tự tên trò.
 *
 * Luật y bản cũ: chọn MỘT con rồi tung ba xúc xắc độc lập. Trúng bao nhiêu
 * viên thì ăn bấy nhiêu lần tiền cược; không viên nào thì mất cược.
 *
 *   0 viên → −1× (125/216 ≈ 57,9 %)
 *   1 viên → +1× ( 75/216 ≈ 34,7 %)
 *   2 viên → +2× ( 15/216 ≈  6,9 %)
 *   3 viên → +3× (  1/216 ≈  0,5 %)
 *
 * Kỳ vọng của người chơi là −17/216 ≈ −7,9 % mỗi ván. Nói thẳng ra ở trang
 * chơi: đây là chỗ TIÊU điểm cho vui, không phải chỗ kiếm điểm.
 */
/**
 * Sáu ô TRÊN MẶT BÀN gốc (`baucua/ban.gif`, 135×85), kèm vị trí từng ô.
 *
 * Toạ độ đo thẳng trên ảnh chứ không ước lượng: khung vẽ trong ảnh nằm ở
 * x = 2, 51, 100 và y = 4, 52, mỗi ô 32×32 pixel. Quy ra phần trăm để ô bấm
 * co giãn theo ảnh. Lưới CSS đều nhau KHÔNG khớp được vì lề trái, lề phải và
 * khoảng cách giữa các ô trong ảnh vốn không bằng nhau — cứ chia đều là viền
 * lệch khỏi khung vẽ, nhìn rất chối.
 *
 * Thứ tự ô trên bàn: hàng trên Nai, Bầu, Gà; hàng dưới Tôm, Cua, Cá. Không
 * phải thứ tự 1→6 của mấy tệp ảnh xúc xắc.
 */
const O_W = (32 / 135) * 100;
const O_H = (32 / 85) * 100;
const COT = [2, 51, 100].map((x) => (x / 135) * 100);
const HANG = [4, 52].map((y) => (y / 85) * 100);

export const BAUCUA_BAN = ([1, 2, 3, 6, 5, 4] as const).map((con, i) => ({
  con,
  left: `${COT[i % 3]!.toFixed(3)}%`,
  top: `${HANG[Math.floor(i / 3)]!.toFixed(3)}%`,
  width: `${O_W.toFixed(3)}%`,
  height: `${O_H.toFixed(3)}%`,
}));

export const BAUCUA_CONS = [
  { id: 1, ten: 'Nai' },
  { id: 2, ten: 'Bầu' },
  { id: 3, ten: 'Gà' },
  { id: 4, ten: 'Cá' },
  { id: 5, ten: 'Cua' },
  { id: 6, ten: 'Tôm' },
] as const;

export const BAUCUA_MIN = 10;
export const BAUCUA_MAX = 100;

/**
 * Nhịp một phiên bầu cua chung, chia làm ba pha:
 *
 *   [0s → 45s)  ĐẶT CỬA   — ai đặt gì thì đặt, thấy cả bàn đang đặt gì
 *   [45s → 50s) XÓC       — bát úp lại, rung; chưa ai được thấy kết quả
 *   [50s → 60s) KẾT QUẢ   — mở bát, ai ăn ai thua rõ ràng
 *
 * Quãng xóc năm giây không phải để trang trí: mở bát ngay lúc hết giờ thì người
 * đặt cửa cuối cùng chưa kịp buông tay đã thấy kết quả, mất hẳn cái hồi hộp vốn
 * là toàn bộ cái thú của trò này.
 *
 * Chọn 60 giây tròn vì mã phiên tính thẳng từ đồng hồ: chia cho 60 giây là ra,
 * không cần ai giữ trạng thái.
 */
export const BAUCUA_ROUND_MS = 60_000;
export const BAUCUA_BET_MS = 45_000;
export const BAUCUA_XOC_MS = 5_000;
/** Mốc mở bát, tính từ đầu phiên. */
export const BAUCUA_REVEAL_MS = BAUCUA_BET_MS + BAUCUA_XOC_MS;

/** Trần số cửa một người đặt trong một phiên — sáu cửa là hết bàn. */
export const BAUCUA_CUA_MOI_PHIEN = 6;

// ─────────────────────────── Oẳn tù tì ───────────────────────────

/** Búa thắng Kéo, Kéo thắng Bao, Bao thắng Búa. */
export const OTT_TAY = [
  { id: 1, ten: 'Búa', anh: 'bua.png' },
  { id: 2, ten: 'Kéo', anh: 'keo.png' },
  { id: 3, ten: 'Bao', anh: 'bao.png' },
] as const;

export const OTT_MIN = 10;
export const OTT_MAX = 100;

/** Ai thắng: 1 = người chơi, 0 = hoà, −1 = máy. */
export function ottKetQua(nguoi: number, may: number): -1 | 0 | 1 {
  if (nguoi === may) return 0;
  // Bản gốc viết nhánh thắng/thua lẫn nhau nên chữ in ra ngược với việc cộng
  // trừ điểm. Ở đây viết thẳng ba nhánh cho khỏi cãi nhau.
  return (nguoi === 1 && may === 2) || (nguoi === 2 && may === 3) || (nguoi === 3 && may === 1)
    ? 1 : -1;
}

// ─────────────────────────── Máy quay xèng ───────────────────────────

/**
 * Máy quay xèng ba hàng ba cột (bản gốc `quayso/`, tám ảnh 19×16).
 *
 * Tên từng biểu tượng lấy theo ĐÚNG chữ trong mã gốc, đối chiếu với ảnh đã mở
 * ra xem: 3 là quả tím, bản cũ gọi là nho thì giữ là nho.
 *
 * ĐỔI TỈ LỆ TRẢ THƯỞNG so với bản gốc. Bản cũ trả một số xu CỐ ĐỊNH bất kể
 * cược bao nhiêu, mà lại chỉ trừ tiền khi thua — ngồi bấm là ra tiền, đúng
 * nghĩa máy in điểm. Ở đây trả theo BỘI SỐ CƯỢC, và cân lại cho nhà cái ăn
 * nhẹ, tính được chính xác chứ không ước lượng:
 *
 *   • 8 đường (3 hàng + 3 cột + 2 chéo), mỗi đường trùng cả ba ô với xác suất
 *     8·(1/8)³ = 1/64 → trung bình 8/64 = 0,125 đường trúng mỗi lượt.
 *   • Bội số trung bình của tám biểu tượng: (2+3+4+5+7+9+20+11)/8 = 7,625.
 *   • Kỳ vọng = 0,125 × 7,625 − 1 = −4,7 % mỗi lượt.
 */
export const XENG_BIEU_TUONG = [
  { id: 1, ten: 'Anh đào', boi: 2 },
  { id: 2, ten: 'Cam', boi: 3 },
  { id: 3, ten: 'Nho', boi: 4 },
  { id: 4, ten: 'Chuối', boi: 5 },
  { id: 5, ten: 'Táo', boi: 7 },
  { id: 6, ten: 'BAR', boi: 9 },
  { id: 7, ten: 'Số 7', boi: 20 },
  { id: 8, ten: 'Đô la', boi: 11 },
] as const;

export const XENG_MIN = 10;
export const XENG_MAX = 100;

/** Tám đường ăn tiền, ghi theo chỉ số ô 0–8 của lưới 3×3. */
export const XENG_DUONG: readonly (readonly [number, number, number])[] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
] as const;

/** Những đường trúng của một lượt quay, kèm tổng bội số. */
export function xengDo(o: readonly number[]): { duong: number[]; boi: number } {
  const duong: number[] = [];
  let boi = 0;
  XENG_DUONG.forEach(([a, b, c], i) => {
    if (o[a] === o[b] && o[b] === o[c]) {
      duong.push(i);
      boi += XENG_BIEU_TUONG.find((t) => t.id === o[a])?.boi ?? 0;
    }
  });
  return { duong, boi };
}

// ─────────────────────────── Phi tiêu ───────────────────────────

/** Sáu bảng phi tiêu của bản cũ, mũi tiêu cắm sẵn mỗi ảnh một chỗ. */
export const PHITIEU_MAT = 6;
export const PHITIEU_MIN = 10;
export const PHITIEU_MAX = 100;

// ─────────────────────────── Sóc đĩa (chẵn / lẻ) ───────────────────────────

/**
 * Bản gốc chia năm phòng với mức cược khác nhau, ở đây gộp làm một và cho tự
 * gõ số điểm — năm trang giống hệt nhau chỉ khác hai con số là năm chỗ phải
 * sửa mỗi lần đổi luật.
 */
export const SOCDIA_MIN = 10;
export const SOCDIA_MAX = 100;

// ─────────────────────────── Đập trứng ───────────────────────────

export const TRUNG_SO = 5;
export const TRUNG_MIN = 10;
export const TRUNG_MAX = 100;

/**
 * Bội số thưởng khi đập trúng. Bản gốc trả 5× rồi nhân đôi nếu trúng luôn quả
 * may mắn, mà KHÔNG trừ cược lúc thắng — kỳ vọng +40 %, lại một máy in điểm.
 *
 * Ở đây: đúng ăn 3× cược, đúng mà trúng luôn quả vàng thì 7×; sai mất cược.
 *   Kỳ vọng = 1/5 × (4/5 × 3 + 1/5 × 7) − 4/5 = 0,76 − 0,8 = −4 %.
 */
export const TRUNG_BOI = 3;
export const TRUNG_BOI_VANG = 7;

// ─────────────────────────── Sút phạt ───────────────────────────

/** Bốn góc khung thành, đúng bốn ô của bảng gốc. */
export const SUT_GOC = [
  { id: 1, ten: 'Góc trên trái' },
  { id: 2, ten: 'Góc trên phải' },
  { id: 3, ten: 'Góc dưới trái' },
  { id: 4, ten: 'Góc dưới phải' },
] as const;

export const SUT_MIN = 10;
export const SUT_MAX = 100;

/**
 * Thủ môn bay đúng một góc, nên cửa vào tới 3/4 — trả 1 ăn 1 là người sút mỗi
 * quả lãi 50 % cược, ngồi sút cả ngày là giàu. Trả 30 % thì kỳ vọng
 * 3/4 × 0,3 − 1/4 = −2,5 %, gần đúng với thực tế đá phạt đền: vào thì thường,
 * hỏng mới là chuyện.
 */
export const SUT_THUONG = 0.3;

/** Điểm thưởng khi bóng vào lưới, làm tròn xuống cho khỏi lẻ. */
export function sutThuong(cuoc: number): number {
  return Math.floor(cuoc * SUT_THUONG);
}

// ─────────────────────────── Trần chung ───────────────────────────

/**
 * Trần số ván cược mỗi ngày cho mỗi trò.
 *
 * Bản gốc KHÔNG có trần — ngồi bấm cả đêm cũng được. Thêm vào vì hai lẽ: nhà
 * cái ăn 7,9 % nghĩa là chơi càng lâu càng chắc chắn cháy túi, và một trang
 * bấm-là-ra-tiền không có trần thì thành chỗ cày điểm bằng script.
 */
export const VAN_MOI_NGAY = 30;

/** Riêng bầu cua đếm theo PHIÊN có đặt cửa, chứ không đếm từng cửa. */
export const BAUCUA_PHIEN_MOI_NGAY = 30;

export const GAME_LABELS = {
  BAUCUA: 'Bầu cua tôm cá',
  OANTUTI: 'Oẳn tù tì',
  QUAYXENG: 'Máy quay xèng',
  PHITIEU: 'Phi tiêu',
  SOCDIA: 'Sóc đĩa',
  DAPTRUNG: 'Đập trứng',
  SUTPHAT: 'Sút phạt',
} as const;
