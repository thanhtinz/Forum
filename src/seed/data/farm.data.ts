// Data nông trại (cây/phân/vật nuôi/công thức) — đưa thẳng vào dự án.
const img = (p: string) => `/game-assets/nongtrai/${p}`;

export interface CropSeed {
  slug: string; name: string; seedPrice: number; sellPrice: number; growSeconds: number;
  exp: number; yieldMin: number; yieldMax: number; reqLevel: number; asset: string; sortOrder: number;
}
export const CROPS: CropSeed[] = [
  { slug: 'ca-chua', name: 'Cà chua', seedPrice: 120, sellPrice: 25, growSeconds: 600, exp: 8, yieldMin: 6, yieldMax: 10, reqLevel: 0, asset: img('pixel/b0/fruit.png'), sortOrder: 0 },
  { slug: 'cu-cai', name: 'Củ cải', seedPrice: 90, sellPrice: 20, growSeconds: 480, exp: 7, yieldMin: 6, yieldMax: 11, reqLevel: 0, asset: img('pixel/b1/fruit.png'), sortOrder: 1 },
  { slug: 'cu-den', name: 'Củ dền', seedPrice: 110, sellPrice: 24, growSeconds: 540, exp: 8, yieldMin: 6, yieldMax: 10, reqLevel: 0, asset: img('pixel/b2/fruit.png'), sortOrder: 2 },
  { slug: 'ca-rot', name: 'Cà rốt', seedPrice: 90, sellPrice: 20, growSeconds: 480, exp: 7, yieldMin: 6, yieldMax: 11, reqLevel: 0, asset: img('pixel/b3/fruit.png'), sortOrder: 3 },
  { slug: 'khoai-lang', name: 'Khoai lang', seedPrice: 150, sellPrice: 30, growSeconds: 660, exp: 10, yieldMin: 5, yieldMax: 10, reqLevel: 1, asset: img('pixel/b4/fruit.png'), sortOrder: 4 },
  { slug: 'khoai-tay', name: 'Khoai tây', seedPrice: 140, sellPrice: 28, growSeconds: 640, exp: 9, yieldMin: 5, yieldMax: 10, reqLevel: 1, asset: img('pixel/b5/fruit.png'), sortOrder: 5 },
  { slug: 'bong', name: 'Bông', seedPrice: 300, sellPrice: 55, growSeconds: 1500, exp: 16, yieldMin: 5, yieldMax: 10, reqLevel: 2, asset: img('pixel/b6/fruit.png'), sortOrder: 6 },
  { slug: 'dau-bap', name: 'Đậu bắp', seedPrice: 200, sellPrice: 40, growSeconds: 900, exp: 12, yieldMin: 5, yieldMax: 9, reqLevel: 1, asset: img('pixel/b10/fruit.png'), sortOrder: 7 },
  { slug: 'ot', name: 'Ớt', seedPrice: 240, sellPrice: 45, growSeconds: 1080, exp: 14, yieldMin: 5, yieldMax: 9, reqLevel: 2, asset: img('pixel/b14/fruit.png'), sortOrder: 8 },
  { slug: 'bap-cai', name: 'Bắp cải', seedPrice: 300, sellPrice: 55, growSeconds: 1500, exp: 16, yieldMin: 5, yieldMax: 10, reqLevel: 3, asset: img('pixel/b15/fruit.png'), sortOrder: 9 },
  { slug: 'ca-tim', name: 'Cà tím', seedPrice: 500, sellPrice: 82, growSeconds: 2100, exp: 24, yieldMin: 5, yieldMax: 10, reqLevel: 4, asset: img('pixel/b13/fruit.png'), sortOrder: 10 },
  { slug: 'bi-ngo', name: 'Bí ngô', seedPrice: 600, sellPrice: 95, growSeconds: 2400, exp: 28, yieldMin: 5, yieldMax: 10, reqLevel: 5, asset: img('pixel/b11/fruit.png'), sortOrder: 11 },
  { slug: 'hoa-chuong', name: 'Hoa chuông', seedPrice: 800, sellPrice: 130, growSeconds: 3000, exp: 36, yieldMin: 4, yieldMax: 8, reqLevel: 7, asset: img('pixel/b8/fruit.png'), sortOrder: 12 },
  { slug: 'hoa-hong', name: 'Hoa hồng', seedPrice: 1100, sellPrice: 175, growSeconds: 4200, exp: 50, yieldMin: 4, yieldMax: 8, reqLevel: 10, asset: img('pixel/b7/fruit.png'), sortOrder: 13 },
  { slug: 'dua-hau', name: 'Dưa hấu', seedPrice: 1300, sellPrice: 200, growSeconds: 5400, exp: 60, yieldMin: 4, yieldMax: 8, reqLevel: 12, asset: img('pixel/b12/fruit.png'), sortOrder: 14 },
  { slug: 'huong-duong', name: 'Hoa hướng dương', seedPrice: 1600, sellPrice: 250, growSeconds: 6000, exp: 70, yieldMin: 4, yieldMax: 8, reqLevel: 14, asset: img('pixel/b9/fruit.png'), sortOrder: 15 },
];

export interface FertilizerSeed { slug: string; name: string; price: number; reduceSeconds: number; asset: string; sortOrder: number; }
export const FERTILIZERS: FertilizerSeed[] = [
  { slug: 'phan-1', name: 'Phân hữu cơ', price: 200, reduceSeconds: 120, asset: img('img/udobr/1.png'), sortOrder: 0 },
  { slug: 'phan-2', name: 'Phân NPK', price: 500, reduceSeconds: 300, asset: img('img/udobr/2.png'), sortOrder: 1 },
  { slug: 'phan-3', name: 'Phân vi sinh', price: 1000, reduceSeconds: 600, asset: img('img/udobr/3.png'), sortOrder: 2 },
  { slug: 'phan-4', name: 'Phân cao cấp', price: 2000, reduceSeconds: 1200, asset: img('img/udobr/4.png'), sortOrder: 3 },
  { slug: 'phan-5', name: 'Phân thần kỳ', price: 4000, reduceSeconds: 2400, asset: img('img/udobr/5.png'), sortOrder: 4 },
];

const DAY = 86400;
export interface AnimalSeed {
  slug: string; name: string; buyPrice: number; growSeconds: number; lifeSeconds: number;
  feedCooldownSec: number; starveSeconds: number; productSlug: string | null; productName: string | null;
  productYield: number; productPrice: number; sellGrown: number; sellYoung: number; asset: string; sortOrder: number;
}
export const ANIMALS: AnimalSeed[] = [
  { slug: 'ga', name: 'Gà', buyPrice: 3000, growSeconds: 3600, lifeSeconds: 7 * DAY, feedCooldownSec: 4200, starveSeconds: DAY, productSlug: 'trung', productName: 'Trứng', productYield: 2, productPrice: 80, sellGrown: 1500, sellYoung: 500, asset: img('animals/ga_s.png'), sortOrder: 0 },
  { slug: 'ga-nau', name: 'Gà nâu', buyPrice: 3500, growSeconds: 3600, lifeSeconds: 7 * DAY, feedCooldownSec: 4200, starveSeconds: DAY, productSlug: 'trung', productName: 'Trứng', productYield: 2, productPrice: 90, sellGrown: 1700, sellYoung: 600, asset: img('animals/ga-nau_s.png'), sortOrder: 1 },
  { slug: 'vit', name: 'Vịt', buyPrice: 6000, growSeconds: 5400, lifeSeconds: 7 * DAY, feedCooldownSec: 5400, starveSeconds: DAY, productSlug: 'trung-vit', productName: 'Trứng vịt', productYield: 2, productPrice: 110, sellGrown: 3000, sellYoung: 1000, asset: img('animals/vit_s.png'), sortOrder: 2 },
  { slug: 'vit-co', name: 'Vịt cò', buyPrice: 7000, growSeconds: 5400, lifeSeconds: 7 * DAY, feedCooldownSec: 5400, starveSeconds: DAY, productSlug: 'trung-vit', productName: 'Trứng vịt', productYield: 2, productPrice: 120, sellGrown: 3500, sellYoung: 1200, asset: img('animals/vit-co_s.png'), sortOrder: 3 },
  { slug: 'lon', name: 'Lợn', buyPrice: 5000, growSeconds: 7200, lifeSeconds: 7 * DAY, feedCooldownSec: 7200, starveSeconds: DAY, productSlug: 'thit-heo', productName: 'Thịt heo', productYield: 2, productPrice: 400, sellGrown: 9000, sellYoung: 2500, asset: img('animals/lon_s.png'), sortOrder: 4 },
  { slug: 'lon-den', name: 'Lợn đen', buyPrice: 6000, growSeconds: 7200, lifeSeconds: 7 * DAY, feedCooldownSec: 7200, starveSeconds: DAY, productSlug: 'thit-heo', productName: 'Thịt heo', productYield: 3, productPrice: 420, sellGrown: 11000, sellYoung: 3000, asset: img('animals/lon-den_s.png'), sortOrder: 5 },
  { slug: 'bo', name: 'Bò', buyPrice: 20000, growSeconds: 10800, lifeSeconds: 10 * DAY, feedCooldownSec: 7200, starveSeconds: DAY, productSlug: 'thit-bo', productName: 'Thịt bò', productYield: 2, productPrice: 600, sellGrown: 25000, sellYoung: 8000, asset: img('animals/bo_s.png'), sortOrder: 6 },
  { slug: 'bo-nau', name: 'Bò nâu', buyPrice: 24000, growSeconds: 10800, lifeSeconds: 10 * DAY, feedCooldownSec: 7200, starveSeconds: DAY, productSlug: 'thit-bo', productName: 'Thịt bò', productYield: 3, productPrice: 650, sellGrown: 30000, sellYoung: 9000, asset: img('animals/bo-nau_s.png'), sortOrder: 7 },
];
