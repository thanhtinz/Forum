// Data nông trại (cây/phân/vật nuôi/công thức) — đưa thẳng vào dự án.
const img = (p: string) => `/game-assets/nongtrai/${p}`;

export interface CropSeed {
  slug: string; name: string; seedPrice: number; sellPrice: number; growSeconds: number;
  exp: number; yieldMin: number; yieldMax: number; reqLevel: number; asset: string; sortOrder: number;
}
export const CROPS: CropSeed[] = [
  { slug: 'lua', name: 'Lúa', seedPrice: 50, sellPrice: 12, growSeconds: 300, exp: 5, yieldMin: 8, yieldMax: 14, reqLevel: 0, asset: img('pixel/b10/fruit.png'), sortOrder: 0 },
  { slug: 'ca-chua', name: 'Cà chua', seedPrice: 120, sellPrice: 25, growSeconds: 600, exp: 8, yieldMin: 6, yieldMax: 10, reqLevel: 0, asset: img('pixel/b0/fruit.png'), sortOrder: 1 },
  { slug: 'toi', name: 'Tỏi', seedPrice: 200, sellPrice: 40, growSeconds: 900, exp: 12, yieldMin: 5, yieldMax: 9, reqLevel: 1, asset: img('pixel/b6/fruit.png'), sortOrder: 2 },
  { slug: 'nho', name: 'Nho', seedPrice: 400, sellPrice: 70, growSeconds: 1800, exp: 20, yieldMin: 6, yieldMax: 12, reqLevel: 3, asset: img('pixel/b1/fruit.png'), sortOrder: 3 },
  { slug: 'thanh-long', name: 'Thanh long', seedPrice: 600, sellPrice: 95, growSeconds: 2400, exp: 28, yieldMin: 5, yieldMax: 10, reqLevel: 5, asset: img('pixel/b14/fruit.png'), sortOrder: 4 },
  { slug: 'xoai', name: 'Xoài', seedPrice: 900, sellPrice: 140, growSeconds: 3600, exp: 40, yieldMin: 5, yieldMax: 9, reqLevel: 8, asset: img('pixel/b4/fruit.png'), sortOrder: 5 },
  { slug: 'dua-hau', name: 'Dưa hấu', seedPrice: 1300, sellPrice: 200, growSeconds: 5400, exp: 60, yieldMin: 4, yieldMax: 8, reqLevel: 12, asset: img('pixel/b12/fruit.png'), sortOrder: 6 },
  { slug: 'ca-rot', name: 'Cà rốt', seedPrice: 90, sellPrice: 20, growSeconds: 480, exp: 7, yieldMin: 6, yieldMax: 11, reqLevel: 0, asset: img('pixel/b3/fruit.png'), sortOrder: 7 },
  { slug: 'khom', name: 'Khóm', seedPrice: 300, sellPrice: 55, growSeconds: 1500, exp: 16, yieldMin: 5, yieldMax: 10, reqLevel: 2, asset: img('pixel/b15/fruit.png'), sortOrder: 8 },
  { slug: 'bap', name: 'Bắp', seedPrice: 160, sellPrice: 32, growSeconds: 720, exp: 10, yieldMin: 6, yieldMax: 10, reqLevel: 1, asset: img('pixel/b10/fruit.png'), sortOrder: 9 },
  { slug: 'dua-leo', name: 'Dưa leo', seedPrice: 240, sellPrice: 45, growSeconds: 1080, exp: 14, yieldMin: 5, yieldMax: 9, reqLevel: 2, asset: img('pixel/b11/fruit.png'), sortOrder: 10 },
  { slug: 'ca-tim', name: 'Cà tím', seedPrice: 500, sellPrice: 82, growSeconds: 2100, exp: 24, yieldMin: 5, yieldMax: 10, reqLevel: 4, asset: img('pixel/b13/fruit.png'), sortOrder: 11 },
  { slug: 'nha-dam', name: 'Nha đam', seedPrice: 700, sellPrice: 110, growSeconds: 2700, exp: 32, yieldMin: 5, yieldMax: 9, reqLevel: 6, asset: img('pixel/b15/fruit.png'), sortOrder: 12 },
  { slug: 'hoa-hong', name: 'Hoa hồng', seedPrice: 1100, sellPrice: 175, growSeconds: 4200, exp: 50, yieldMin: 4, yieldMax: 8, reqLevel: 10, asset: img('pixel/b7/fruit.png'), sortOrder: 13 },
  { slug: 'huong-duong', name: 'Hoa hướng dương', seedPrice: 1600, sellPrice: 250, growSeconds: 6000, exp: 70, yieldMin: 4, yieldMax: 8, reqLevel: 14, asset: img('pixel/b9/fruit.png'), sortOrder: 14 },
  { slug: 'tulip', name: 'Hoa tulip', seedPrice: 2000, sellPrice: 320, growSeconds: 7200, exp: 85, yieldMin: 4, yieldMax: 7, reqLevel: 16, asset: img('pixel/b8/fruit.png'), sortOrder: 15 },
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
  { slug: 'ga', name: 'Gà', buyPrice: 3000, growSeconds: 3600, lifeSeconds: 7 * DAY, feedCooldownSec: 4200, starveSeconds: DAY, productSlug: 'trung', productName: 'Trứng', productYield: 2, productPrice: 80, sellGrown: 1500, sellYoung: 500, asset: img('vatnuoi/50.gif'), sortOrder: 0 },
  { slug: 'lon', name: 'Lợn', buyPrice: 5000, growSeconds: 7200, lifeSeconds: 7 * DAY, feedCooldownSec: 7200, starveSeconds: DAY, productSlug: null, productName: null, productYield: 0, productPrice: 0, sellGrown: 9000, sellYoung: 2500, asset: img('vatnuoi/51.gif'), sortOrder: 1 },
  { slug: 'bo', name: 'Bò sữa', buyPrice: 20000, growSeconds: 10800, lifeSeconds: 10 * DAY, feedCooldownSec: 7200, starveSeconds: DAY, productSlug: 'sua-bo', productName: 'Sữa bò', productYield: 2, productPrice: 300, sellGrown: 25000, sellYoung: 8000, asset: img('vatnuoi/52.gif'), sortOrder: 2 },
  { slug: 'cuu', name: 'Cừu', buyPrice: 18000, growSeconds: 10800, lifeSeconds: 10 * DAY, feedCooldownSec: 7200, starveSeconds: DAY, productSlug: 'long-cuu', productName: 'Lông cừu', productYield: 2, productPrice: 250, sellGrown: 22000, sellYoung: 7000, asset: img('vatnuoi/53.gif'), sortOrder: 3 },
  { slug: 'ca-nuoi', name: 'Cá chép', buyPrice: 4000, growSeconds: 7200, lifeSeconds: 7 * DAY, feedCooldownSec: 7200, starveSeconds: DAY, productSlug: null, productName: null, productYield: 0, productPrice: 0, sellGrown: 7000, sellYoung: 2000, asset: img('vatnuoi/54.gif'), sortOrder: 4 },
  { slug: 'vit', name: 'Vịt', buyPrice: 6000, growSeconds: 5400, lifeSeconds: 7 * DAY, feedCooldownSec: 5400, starveSeconds: DAY, productSlug: 'trung-vit', productName: 'Trứng vịt', productYield: 2, productPrice: 110, sellGrown: 3000, sellYoung: 1000, asset: '', sortOrder: 5 },
  { slug: 'trau', name: 'Trâu', buyPrice: 25000, growSeconds: 12600, lifeSeconds: 12 * DAY, feedCooldownSec: 9000, starveSeconds: DAY, productSlug: null, productName: null, productYield: 0, productPrice: 0, sellGrown: 32000, sellYoung: 10000, asset: '', sortOrder: 6 },
  { slug: 'rua', name: 'Rùa', buyPrice: 30000, growSeconds: 18000, lifeSeconds: 15 * DAY, feedCooldownSec: 10800, starveSeconds: 2 * DAY, productSlug: null, productName: null, productYield: 0, productPrice: 0, sellGrown: 40000, sellYoung: 12000, asset: '', sortOrder: 7 },
];

export interface RecipeSeed {
  slug: string; name: string; cookSeconds: number; reward: number; skillExp: number; needSkill: boolean;
  reqLevel: number; asset: string; sortOrder: number; ingredients: { slug: string; name: string; quantity: number }[];
}
export const RECIPES: RecipeSeed[] = [
  { slug: 'com-trang', name: 'Cơm trắng', cookSeconds: 300, reward: 250, skillExp: 0, needSkill: false, reqLevel: 0, asset: img('nhabep/1.png'), sortOrder: 0, ingredients: [{ slug: 'lua', name: 'Lúa', quantity: 5 }] },
  { slug: 'salad', name: 'Salad cà chua', cookSeconds: 480, reward: 400, skillExp: 0, needSkill: false, reqLevel: 0, asset: img('nhabep/2.png'), sortOrder: 1, ingredients: [{ slug: 'ca-chua', name: 'Cà chua', quantity: 4 }, { slug: 'toi', name: 'Tỏi', quantity: 2 }] },
  { slug: 'trung-chien', name: 'Trứng chiên', cookSeconds: 360, reward: 500, skillExp: 0, needSkill: false, reqLevel: 0, asset: img('nhabep/3.png'), sortOrder: 2, ingredients: [{ slug: 'trung', name: 'Trứng', quantity: 3 }] },
  { slug: 'sua-chua', name: 'Sữa chua', cookSeconds: 900, reward: 1200, skillExp: 500, needSkill: true, reqLevel: 5, asset: img('nhabep/4.png'), sortOrder: 3, ingredients: [{ slug: 'sua-bo', name: 'Sữa bò', quantity: 3 }] },
  { slug: 'banh-nho', name: 'Bánh nho', cookSeconds: 1200, reward: 1800, skillExp: 800, needSkill: true, reqLevel: 8, asset: img('nhabep/5.png'), sortOrder: 4, ingredients: [{ slug: 'nho', name: 'Nho', quantity: 6 }, { slug: 'trung', name: 'Trứng', quantity: 2 }] },
];
