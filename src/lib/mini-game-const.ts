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

// ─────────────────────────── Hộp quà mỗi ngày ───────────────────────────

/** Quà mỗi lần nhận. Bản cũ: 5.000 xu. */
export const GIFT_POINTS = 50;
/** Khoảng cách giữa hai lần nhận — bản cũ đếm đủ 24 giờ chứ không reset lúc nửa đêm. */
export const GIFT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

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

// ─────────────────────────── Trần chung ───────────────────────────

/**
 * Trần số ván cược mỗi ngày cho mỗi trò.
 *
 * Bản gốc KHÔNG có trần — ngồi bấm cả đêm cũng được. Thêm vào vì hai lẽ: nhà
 * cái ăn 7,9 % nghĩa là chơi càng lâu càng chắc chắn cháy túi, và một trang
 * bấm-là-ra-tiền không có trần thì thành chỗ cày điểm bằng script.
 */
export const VAN_MOI_NGAY = 30;

export const GAME_LABELS = {
  GIFT: 'Hộp quà mỗi ngày',
  BAUCUA: 'Bầu cua tôm cá',
  OANTUTI: 'Oẳn tù tì',
} as const;
