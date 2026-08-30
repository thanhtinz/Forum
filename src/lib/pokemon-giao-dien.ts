/**
 * Bảng màu và hình nền cho từng khu của Đảo Pokémon.
 *
 * Tách khỏi `pokemon-const.ts` vì đây thuần là chuyện trình bày: `pokemon-const`
 * là luật chơi, máy chủ đọc nó để tính sát thương, không việc gì phải kéo theo
 * mã màu. Bản gốc chỉ có đúng một nền trắng cho cả mười lăm khu nên phần này
 * hoàn toàn là làm mới.
 *
 * Mỗi khu cho ra bốn biến CSS:
 *   --dao-xa    trời/nền xa
 *   --dao-gan   mặt đất/nền gần
 *   --dao-nhan  màu nhấn (viền, thanh, chữ nhấn)
 *   --dao-chu   màu chữ trên nền ấy
 */
export interface CanhKhu {
  xa: string;
  gan: string;
  nhan: string;
  chu: string;
  /** Bầu trời tối thì chữ phải sáng — quyết định luôn ở đây cho khỏi đoán. */
  toi: boolean;
}

const CANH: Record<string, CanhKhu> = {
  co: { xa: '#bfe6ff', gan: '#8fd67a', nhan: '#3f9e4d', chu: '#14361c', toi: false },
  ao: { xa: '#cdeffb', gan: '#7fc9c4', nhan: '#1f8f96', chu: '#0d3336', toi: false },
  map2: { xa: '#9fd8a6', gan: '#3f8f52', nhan: '#1f6b34', chu: '#f2fff4', toi: true },
  dong: { xa: '#5a4f63', gan: '#332c3c', nhan: '#a98bd6', chu: '#f0eaf7', toi: true },
  map3: { xa: '#d9c8a8', gan: '#9a8163', nhan: '#7a5c38', chu: '#fff8ec', toi: true },
  ho3: { xa: '#bfe0f7', gan: '#5aa7d8', nhan: '#1f6fa8', chu: '#f2faff', toi: true },
  ho4: { xa: '#a9d2f2', gan: '#3f86c4', nhan: '#1a5c90', chu: '#f2faff', toi: true },
  map4: { xa: '#ffe6a8', gan: '#e0b46a', nhan: '#b07c28', chu: '#3d2a06', toi: false },
  ho5: { xa: '#dff0fb', gan: '#a8cfe4', nhan: '#4f8fb0', chu: '#12303d', toi: false },
  ho7: { xa: '#cfd9e6', gan: '#8fa3b8', nhan: '#4a6480', chu: '#f4f8fc', toi: true },
  map5: { xa: '#eaf6ff', gan: '#c3ddf0', nhan: '#5d92b8', chu: '#12303d', toi: false },
  ho9: { xa: '#3d5068', gan: '#1f2c3d', nhan: '#5aa7d8', chu: '#eef6ff', toi: true },
  ho11: { xa: '#2b3a50', gan: '#141c29', nhan: '#4f9ad0', chu: '#eef6ff', toi: true },
  lanhtho: { xa: '#7a3b3b', gan: '#3d1c1c', nhan: '#e06a4f', chu: '#fff0eb', toi: true },
  huyenthoai: { xa: '#4a2f6b', gan: '#241338', nhan: '#c08cff', chu: '#f6efff', toi: true },
  gio: { xa: '#d8f2c8', gan: '#8fc46a', nhan: '#4f8f2f', chu: '#1c3610', toi: false },
  nuiLua: { xa: '#7a2a18', gan: '#3a0f08', nhan: '#ff8b3d', chu: '#fff1e6', toi: true },
  bien: { xa: '#123a5c', gan: '#04121f', nhan: '#3fd0e0', chu: '#e8fbff', toi: true },
  thanh: { xa: '#4a4458', gan: '#1d1a26', nhan: '#b8a4e0', chu: '#f3efff', toi: true },
  rong: { xa: '#2a1030', gan: '#0d0413', nhan: '#ff5fa2', chu: '#ffeef6', toi: true },
};

const MAC_DINH = CANH.co!;

export function canhKhu(ma: string): CanhKhu {
  return CANH[ma] ?? MAC_DINH;
}

/** Biến CSS để gắn vào `style` của khung — dùng chung cho mọi lớp `.dao-*`. */
export function bienCanh(ma: string): React.CSSProperties {
  const c = canhKhu(ma);
  return {
    '--dao-xa': c.xa,
    '--dao-gan': c.gan,
    '--dao-nhan': c.nhan,
    '--dao-chu': c.chu,
  } as React.CSSProperties;
}

/** Bốn mức hiếm suy ra từ chỉ số cộng thêm của món đồ. */
export const MUC_HIEM = [
  { tu: 0, ten: 'Thường', lop: 'text-ink-500', vien: 'border-ink-300 dark:border-ink-600' },
  { tu: 10, ten: 'Hiếm', lop: 'text-sky-600 dark:text-sky-400', vien: 'border-sky-400' },
  { tu: 100, ten: 'Sử thi', lop: 'text-violet-600 dark:text-violet-400', vien: 'border-violet-400' },
  { tu: 1000, ten: 'Huyền thoại', lop: 'text-amber-600 dark:text-amber-400', vien: 'border-amber-400' },
] as const;

export function mucHiem(chiSo: number): (typeof MUC_HIEM)[number] {
  let ra: (typeof MUC_HIEM)[number] = MUC_HIEM[0]!;
  for (const m of MUC_HIEM) if (chiSo >= m.tu) ra = m;
  return ra;
}
