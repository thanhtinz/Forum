/**
 * Bảng màu của Đảo Rồng.
 *
 * Tách khỏi `rong-const.ts` vì đây thuần là chuyện trình bày: `rong-const` là
 * luật chơi, máy chủ đọc nó để tính sát thương, không việc gì phải kéo theo mã
 * màu. Cùng lối `pokemon-giao-dien.ts`.
 *
 * Khác Đảo Pokémon ở chỗ: đảo ấy đổi màu theo KHU đang đứng, còn đảo này không
 * có khu nào cả — nên màu đổi theo MÀU CỦA CON RỒNG đang cử ra trận. Sáu màu
 * rồng là sáu tông cảnh, và đi giữa các trang thì tông ấy giữ nguyên.
 *
 * Mỗi tông cho ra bốn biến CSS:
 *   --rong-xa    trời/nền xa
 *   --rong-gan   mặt đất/nền gần
 *   --rong-nhan  màu nhấn (viền, thanh, chữ nhấn)
 *   --rong-chu   màu chữ trên nền ấy
 */
export interface CanhRong {
  xa: string;
  gan: string;
  nhan: string;
  chu: string;
  /** Nền tối thì chữ phải sáng — quyết định luôn ở đây cho khỏi đoán. */
  toi: boolean;
}

/**
 * Sáu tông theo sáu màu rồng, đúng thứ tự `MAU_TEN` trong `rong-const.ts`:
 * Lam · Bạch · Lục · Tía · Kim · Huyền.
 */
const CANH: Record<number, CanhRong> = {
  1: { xa: '#bfe0f7', gan: '#3f86c4', nhan: '#1f6fa8', chu: '#f2faff', toi: true },
  2: { xa: '#f4f7fb', gan: '#cdd6e2', nhan: '#6b7f99', chu: '#1a2430', toi: false },
  3: { xa: '#d8f2c8', gan: '#5fa347', nhan: '#3f7f2f', chu: '#f4fff0', toi: true },
  4: { xa: '#e7d6f5', gan: '#7b52a8', nhan: '#9b6fd0', chu: '#faf4ff', toi: true },
  5: { xa: '#ffeaa8', gan: '#c9932c', nhan: '#a8761a', chu: '#3d2c06', toi: false },
  6: { xa: '#3c3550', gan: '#16121f', nhan: '#a98bd6', chu: '#f0eaf7', toi: true },
};

const MAC_DINH = CANH[1]!;

export function canhRong(mau: number): CanhRong {
  return CANH[mau] ?? MAC_DINH;
}

/** Biến CSS gắn vào `style` của khung — dùng chung cho mọi lớp `.rong-*`. */
export function bienCanhRong(mau: number): React.CSSProperties {
  const c = canhRong(mau);
  return {
    '--rong-xa': c.xa,
    '--rong-gan': c.gan,
    '--rong-nhan': c.nhan,
    '--rong-chu': c.chu,
  } as React.CSSProperties;
}
