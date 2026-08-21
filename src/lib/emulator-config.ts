/**
 * Cấu hình emulator theo từng game — kiểu J2ME Loader nhưng bỏ bước import:
 * bấm vào game nào là chơi game đó, cấu hình gắn sẵn theo game và tự nạp lại.
 *
 * File này dùng chung cho server và client nên không được import gì của Node.
 */

export type ScalingMode = 'fit' | 'stretch' | 'original';
export type FilterMode = 'sharp' | 'smooth';
export type FontSize = 'small' | 'medium' | 'large';

export interface EmulatorConfig {
  /** Kích thước màn hình ảo; `null` = dùng đúng thông số máy đã chọn. */
  screenWidth: number | null;
  screenHeight: number | null;
  /** `fit` giữ tỉ lệ, `stretch` kéo đầy khung, `original` giữ đúng 1:1 pixel gốc. */
  scaling: ScalingMode;
  /** `sharp` giữ pixel vuông (đúng chất máy cổ), `smooth` làm mượt khi phóng to. */
  filter: FilterMode;
  /** Giới hạn khung hình; 0 = không giới hạn. */
  fps: number;
  /** Hệ số tốc độ chạy — game Java hay chậm, kéo lên 2× là mượt hẳn. */
  speed: number;
  fontSize: FontSize;
  sound: boolean;
  /** Bật rung khi bấm phím ảo (nếu máy hỗ trợ). */
  vibrate: boolean;
}

export const DEFAULT_CONFIG: EmulatorConfig = {
  screenWidth: null,
  screenHeight: null,
  scaling: 'fit',
  filter: 'sharp',
  fps: 30,
  speed: 1,
  fontSize: 'medium',
  sound: true,
  vibrate: true,
};

/** Các độ phân giải Java ME phổ biến, xếp từ máy cổ nhất lên. */
export const SCREEN_PRESETS: { w: number; h: number; note?: string }[] = [
  { w: 96, h: 65, note: 'Nokia đời 2002' },
  { w: 128, h: 128 },
  { w: 128, h: 160 },
  { w: 132, h: 176, note: 'Siemens' },
  { w: 176, h: 208, note: 'Nokia S60' },
  { w: 176, h: 220, note: 'Sony Ericsson' },
  { w: 208, h: 208 },
  { w: 240, h: 320, note: 'phổ biến nhất' },
  { w: 240, h: 400 },
  { w: 320, h: 240, note: 'nằm ngang' },
  { w: 352, h: 416 },
  { w: 360, h: 640 },
  { w: 480, h: 800 },
];

/** Các mức tốc độ cho sẵn. */
export const SPEED_STEPS = [0.5, 0.75, 1, 1.5, 2, 3] as const;
/** Các mức giới hạn khung hình; 0 = bỏ giới hạn. */
export const FPS_STEPS = [15, 20, 25, 30, 45, 60, 0] as const;

export const SCALING_LABEL: Record<ScalingMode, string> = {
  fit: 'Vừa khung (giữ tỉ lệ)',
  stretch: 'Kéo đầy màn hình',
  original: 'Gốc 1:1',
};

export const FILTER_LABEL: Record<FilterMode, string> = {
  sharp: 'Sắc nét (pixel vuông)',
  smooth: 'Mượt',
};

export const FONT_SIZE_LABEL: Record<FontSize, string> = {
  small: 'Nhỏ',
  medium: 'Vừa',
  large: 'Lớn',
};

const MIN_SIDE = 64;
const MAX_SIDE = 1024;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Đọc cấu hình từ dữ liệu ngoài (DB hoặc localStorage) và trám giá trị hợp lệ.
 * Dữ liệu hỏng hay thiếu trường đều rơi về mặc định chứ không ném lỗi.
 */
export function parseConfig(raw: unknown): EmulatorConfig {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof EmulatorConfig, unknown>>;

  const side = (x: unknown): number | null => {
    const n = typeof x === 'number' ? x : Number(x);
    return Number.isFinite(n) && n > 0 ? Math.round(clamp(n, MIN_SIDE, MAX_SIDE)) : null;
  };

  const w = side(v.screenWidth);
  const h = side(v.screenHeight);

  return {
    // Chỉ nhận khi có đủ cả hai chiều, tránh khung hình méo vì thiếu một nửa.
    screenWidth: w !== null && h !== null ? w : null,
    screenHeight: w !== null && h !== null ? h : null,
    scaling: v.scaling === 'stretch' || v.scaling === 'original' ? v.scaling : 'fit',
    filter: v.filter === 'smooth' ? 'smooth' : 'sharp',
    fps: FPS_STEPS.includes(Number(v.fps) as never) ? Number(v.fps) : DEFAULT_CONFIG.fps,
    speed: SPEED_STEPS.includes(Number(v.speed) as never) ? Number(v.speed) : DEFAULT_CONFIG.speed,
    fontSize: v.fontSize === 'small' || v.fontSize === 'large' ? v.fontSize : 'medium',
    sound: v.sound !== false,
    vibrate: v.vibrate !== false,
  };
}

/** Cấu hình có khác mặc định không — để hiện dấu chấm "đã tuỳ chỉnh". */
export function isCustomised(c: EmulatorConfig): boolean {
  return (Object.keys(DEFAULT_CONFIG) as (keyof EmulatorConfig)[])
    .some((k) => c[k] !== DEFAULT_CONFIG[k]);
}

/** Kích thước màn hình ảo cuối cùng: cấu hình đè lên thông số máy. */
export function effectiveScreen(
  config: EmulatorConfig,
  device: { width: number; height: number },
  landscape: boolean,
): { w: number; h: number } {
  const w = config.screenWidth ?? device.width;
  const h = config.screenHeight ?? device.height;
  return landscape ? { w: h, h: w } : { w, h };
}

/** Khoá localStorage giữ cấu hình cho khách chưa đăng nhập. */
export function configStorageKey(gameSlug: string): string {
  return `nova:games:config:${gameSlug}`;
}
