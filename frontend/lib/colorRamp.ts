// Sinh bảng màu (thang 50→950) từ một màu chủ đạo duy nhất, giữ nguyên "độ tương phản"
// (đường cong lightness) của bảng màu mặc định — chỉ đổi tông màu (hue/saturation).
// Dùng cho: (1) trang admin xem trước, (2) ThemeInjector áp CSS variable lúc chạy.

export const BRAND_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// Đường cong lightness (%) của bảng "xanh thép" mặc định, theo từng bậc trên.
const LIGHTNESS_CURVE: Record<number, number> = {
  50: 95, 100: 90, 200: 81, 300: 69, 400: 53, 500: 41, 600: 34, 700: 29, 800: 25, 900: 20, 950: 13,
};

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = (g - b) / d + (g < b ? 6 : 0); break;
      case g: hue = (b - r) / d + 2; break;
      case b: hue = (r - g) / d + 4; break;
    }
    hue /= 6;
  }
  return [hue * 360, sat * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue2rgb = (t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255),
  ];
}

/** hex hợp lệ dạng #rgb hoặc #rrggbb */
export function isValidHex(hex: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex.trim());
}

function normalizeHex(hex: string): string {
  const h = hex.trim();
  if (/^#[0-9a-f]{3}$/i.test(h)) {
    return '#' + h.slice(1).split('').map((c) => c + c).join('');
  }
  return h;
}

/** Sinh bảng màu 50→950 (mỗi giá trị là chuỗi "r g b") từ 1 màu chủ đạo. */
export function generateBrandRamp(hex: string): Record<number, string> {
  const [h, sRaw] = hexToHsl(normalizeHex(hex));
  const s = Math.max(sRaw, 30); // giữ tối thiểu độ bão hoà để không bị nhạt/xám
  const ramp: Record<number, string> = {};
  for (const shade of BRAND_SHADES) {
    const [r, g, b] = hslToRgb(h, s, LIGHTNESS_CURVE[shade]);
    ramp[shade] = `${r} ${g} ${b}`;
  }
  return ramp;
}

export function generateBrandRampHex(hex: string): Record<number, string> {
  const [h, sRaw] = hexToHsl(normalizeHex(hex));
  const s = Math.max(sRaw, 30);
  const ramp: Record<number, string> = {};
  for (const shade of BRAND_SHADES) {
    const [r, g, b] = hslToRgb(h, s, LIGHTNESS_CURVE[shade]);
    ramp[shade] = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  return ramp;
}
