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
 * Thứ tự sáu ô TRÊN MẶT BÀN gốc (`baucua/ban.gif`, 135×85): hàng trên Nai, Bầu,
 * Gà; hàng dưới Tôm, Cua, Cá. Không phải thứ tự 1→6 của mấy tệp ảnh xúc xắc.
 */
export const BAUCUA_BAN = [1, 2, 3, 6, 5, 4] as const;

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
} as const;
