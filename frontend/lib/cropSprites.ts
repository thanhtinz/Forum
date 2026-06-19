// Map cây trồng -> bộ sprite "Pixel Lands Farm" (icon nông sản + 5 giai đoạn lớn dần).
// Art đã cắt sẵn trong /public/game-assets/nongtrai/pixel/b<N>/{fruit,0..4}.png
// Có thể chỉnh map này để đổi sprite cho từng cây.
const BASE = '/game-assets/nongtrai/pixel';
const STAGES = 5;

export const CROP_BAND: Record<string, string> = {
  'lua': 'b10',
  'ca-chua': 'b0',
  'toi': 'b6',
  'nho': 'b1',
  'thanh-long': 'b14',
  'xoai': 'b4',
  'dua-hau': 'b12',
  'ca-rot': 'b3',
  'khom': 'b15',
  'bap': 'b10',
  'dua-leo': 'b11',
  'ca-tim': 'b13',
  'nha-dam': 'b15',
  'hoa-hong': 'b7',
  'huong-duong': 'b9',
  'tulip': 'b8',
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

// Sprite thú nuôi (Pixel Lands Farm) — chỉ những con có trong pack
export const ANIMAL_ART: Record<string, string> = {
  ga: '/game-assets/nongtrai/pixel-animals/ga.png',
  bo: '/game-assets/nongtrai/pixel-animals/bo.png',
  cuu: '/game-assets/nongtrai/pixel-animals/cuu.png',
};
export function animalSprite(slug: string): string | null {
  return ANIMAL_ART[slug] || null;
}

