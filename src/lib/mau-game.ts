/**
 * Màu và chữ tắt cho game chưa có ảnh biểu tượng.
 *
 * Kho mới lập thì phần lớn game chưa có icon. Bỏ trắng thì trang chủ thành một
 * lưới ô xám không phân biệt được ô nào với ô nào — mà mắt người tìm game chủ
 * yếu bằng MÀU và HÌNH, không phải bằng đọc tên.
 *
 * Màu suy ra từ tên game nên cùng một game ở mọi trang luôn ra đúng một màu,
 * và không cần lưu thêm cột nào.
 */

const BANG_MAU = [
  ['#f97362', '#c8324d'],
  ['#5eb0f5', '#2b5fd9'],
  ['#4ecb9a', '#1d8f6d'],
  ['#f7b955', '#d4761b'],
  ['#a78bfa', '#6d3fd4'],
  ['#22d3ee', '#0e7490'],
  ['#fb7185', '#9f1239'],
  ['#94a3b8', '#475569'],
] as const;

/** Băm tên thành một số ổn định — cùng tên là cùng số, ở máy nào cũng vậy. */
function bam(chu: string): number {
  let h = 0;
  for (let i = 0; i < chu.length; i++) h = (h * 31 + chu.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function mauCuaGame(ten: string): { tu: string; den: string } {
  const [tu, den] = BANG_MAU[bam(ten) % BANG_MAU.length];
  return { tu, den };
}

/**
 * Chữ tắt: hai chữ cái đầu của hai từ đầu ("Bounce Tales" → "BT").
 * Một từ thì lấy hai ký tự đầu của chính nó ("Contra" → "CO").
 */
export function chuTat(ten: string): string {
  const tu = ten.trim().split(/\s+/).filter(Boolean);
  if (tu.length === 0) return '?';
  if (tu.length === 1) return tu[0].slice(0, 2).toUpperCase();
  return (tu[0][0] + tu[1][0]).toUpperCase();
}
