/**
 * Màu và hình cho Ô THỂ LOẠI ở trang tìm.
 *
 * Cùng lẽ với `mau-game.ts`: mắt người tìm game chạy theo màu và hình trước,
 * đọc chữ sau. Một lưới mười ô chữ đen trên nền trắng thì phải đọc từng ô mới
 * biết ô nào là ô nào; mười ô mười màu thì lần thứ hai vào trang, tay đã biết
 * "gian đua xe là ô cam ở hàng thứ hai" trước khi mắt kịp đọc.
 *
 * Hình là EMOJI chứ không phải ảnh: nó có sẵn trên mọi máy, không tốn một lượt
 * tải nào, và không phải thứ hình vẽ tay tạm bợ mà rồi chẳng ai thay.
 */

/** Màu dịu hơn bảng của biểu tượng game: ô này to, mà to thì màu gắt chói mắt. */
const BANG = [
  ['#5eb0f5', '#2b5fd9'],
  ['#f97362', '#c8324d'],
  ['#4ecb9a', '#1d8f6d'],
  ['#f7b955', '#d4761b'],
  ['#a78bfa', '#6d3fd4'],
  ['#22d3ee', '#0e7490'],
  ['#fb7185', '#9f1239'],
  ['#34d399', '#047857'],
] as const;

/*
 * Hình gắn theo ĐƯỜNG DẪN, không theo tên.
 *
 * Tên thể loại quản trị sửa được bất cứ lúc nào ("Đua xe" thành "Tốc độ"), còn
 * đường dẫn thì đổi là gãy mọi liên kết cũ nên gần như không ai đụng. Gắn theo
 * thứ ổn định hơn thì đổi tên không làm gian đua xe mất cái xe.
 */
const HINH: Record<string, string> = {
  'hanh-dong': '💥',
  'phieu-luu': '🗺️',
  arcade: '🕹️',
  'dua-xe': '🏎️',
  'giai-do': '🧩',
  'nhap-vai': '⚔️',
  'chien-thuat': '♟️',
  'the-thao': '⚽',
  'mo-phong': '🏗️',
  'thuong-thuc': '🎲',
  'ban-sung': '🎯',
  'the-bai': '🃏',
  nhac: '🎵',
};

/** Hình dự phòng cho thể loại mới do quản trị thêm — vẫn là hình của cửa hàng game. */
const HINH_DU = ['🎮', '🕹️', '🎯', '🎲'];

function bam(chu: string): number {
  let h = 0;
  for (let i = 0; i < chu.length; i++) h = (h * 31 + chu.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Màu lấy theo CHỖ ĐỨNG trong lưới, hình lấy theo đường dẫn.
 *
 * Thoạt nghĩ thì băm đường dẫn ra màu là gọn hơn — thể loại nào cũng giữ đúng
 * một màu ở mọi trang. Nhưng dựng thử rồi nhìn tận mắt mới thấy: băm không
 * ngăn được hai ô cạnh nhau ra cùng một màu, và lưới mười ô hoá ra có bốn ô đỏ
 * nằm liền kề. Lúc ấy màu hết làm được việc của nó là tách các ô ra.
 *
 * Đếm theo chỗ đứng thì hai ô cạnh nhau không bao giờ trùng màu. Cái giá là
 * quản trị chèn một thể loại vào giữa thì mấy ô sau đổi màu — đổi một lần, còn
 * bốn ô đỏ dính nhau thì ngày nào cũng khó nhìn.
 */
export function veTheLoai(duongDan: string, thu = 0): { tu: string; den: string; hinh: string } {
  const [tu, den] = BANG[thu % BANG.length];
  return { tu, den, hinh: HINH[duongDan] ?? HINH_DU[bam(duongDan) % HINH_DU.length] };
}
