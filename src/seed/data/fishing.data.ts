// Data câu cá — 3 loài cho 3 khu (đưa thẳng vào dự án, không cần seed thủ công).
export interface FishSeed {
  zone: number;
  slug: string;
  name: string;
  kgMin: number;
  kgMax: number;
  pricePerKg: number;
  refillCount: number;
  asset: string;
  sortOrder: number;
}

export const FISH_SPECIES: FishSeed[] = [
  { zone: 1, slug: 'ca-ro', name: 'Cá rô', kgMin: 1, kgMax: 3, pricePerKg: 50, refillCount: 70, asset: '/game-assets/cauca/1.png', sortOrder: 0 },
  { zone: 2, slug: 'ca-long-tong', name: 'Cá lòng tong', kgMin: 2, kgMax: 6, pricePerKg: 120, refillCount: 40, asset: '/game-assets/cauca/2.png', sortOrder: 0 },
  { zone: 3, slug: 'ca-map', name: 'Cá mập', kgMin: 8, kgMax: 25, pricePerKg: 400, refillCount: 15, asset: '/game-assets/cauca/3.png', sortOrder: 0 },
];
