// Map cây trồng -> bộ sprite "Pixel Lands Farm" (icon nông sản + 5 giai đoạn lớn dần).
// Art đã cắt sẵn trong /public/game-assets/nongtrai/pixel/b<N>/{fruit,0..4}.png
// Có thể chỉnh map này để đổi sprite cho từng cây.
const BASE = '/game-assets/nongtrai/pixel';
const STAGES = 5;

export const CROP_BAND: Record<string, string> = {
  'ca-chua': 'b0',
  'cu-cai': 'b1',
  'cu-den': 'b2',
  'ca-rot': 'b3',
  'khoai-lang': 'b4',
  'khoai-tay': 'b5',
  'bong': 'b6',
  'hoa-hong': 'b7',
  'hoa-chuong': 'b8',
  'huong-duong': 'b9',
  'dau-bap': 'b10',
  'bi-ngo': 'b11',
  'dua-hau': 'b12',
  'ca-tim': 'b13',
  'ot': 'b14',
  'bap-cai': 'b15',
};

// Icon nông sản (cho cửa hàng / kho / sản phẩm thu hoạch)
export function cropFruit(slug: string): string | null {
  const b = CROP_BAND[slug];
  return b ? `${BASE}/${b}/fruit.png` : null;
}

// Ảnh cây theo giai đoạn lớn (cho ô đất ở nông trại)
export function cropStage(slug: string, ready: boolean, progress: number): string | null {
  const b = CROP_BAND[slug];
  if (!b) return null;
  const idx = ready ? STAGES - 1 : Math.max(0, Math.min(STAGES - 1, Math.floor((progress || 0) * STAGES)));
  return `${BASE}/${b}/${idx}.png`;
}

// Sprite thú nuôi (GHAP) — ảnh tĩnh (cho <img>) + class hoạt ảnh (steps)
const ANIMAL_SLUGS = ['ga', 'ga-nau', 'vit', 'vit-co', 'lon', 'lon-den', 'bo', 'bo-nau'];
export const ANIMAL_ART: Record<string, string> = Object.fromEntries(
  ANIMAL_SLUGS.map((s) => [s, `/game-assets/nongtrai/animals/${s}_s.png`]),
);
const ANIMAL_ANIM: Record<string, string> = Object.fromEntries(ANIMAL_SLUGS.map((s) => [s, `fa-${s}`]));
export function animalSprite(slug: string): string | null {
  return ANIMAL_ART[slug] || null;
}
export function animalAnimClass(slug: string): string | null {
  return ANIMAL_ANIM[slug] || null;
}

