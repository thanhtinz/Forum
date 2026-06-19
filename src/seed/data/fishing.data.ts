// Data câu cá — 1 hồ chia theo ĐỘ SÂU. Cá, độ sâu, cần câu, thuyền seed sẵn (admin sửa được).
export interface FishSeed {
  zone: number;
  depth: number;
  slug: string;
  name: string;
  kgMin: number;
  kgMax: number;
  pricePerKg: number;
  refillCount: number;
  asset: string;
  sortOrder: number;
}

// Map khu cũ -> độ sâu: khu 1 = nông, 2 = vừa, 3 = sâu
export const FISH_SPECIES: FishSeed[] = [
  { zone: 1, depth: 1, slug: 'ca-ro', name: 'Cá rô', kgMin: 1, kgMax: 3, pricePerKg: 50, refillCount: 70, asset: '/game-assets/cauca/1.png', sortOrder: 0 },
  { zone: 2, depth: 2, slug: 'ca-long-tong', name: 'Cá lòng tong', kgMin: 2, kgMax: 6, pricePerKg: 120, refillCount: 40, asset: '/game-assets/cauca/2.png', sortOrder: 0 },
  { zone: 3, depth: 3, slug: 'ca-map', name: 'Cá mập', kgMin: 8, kgMax: 25, pricePerKg: 400, refillCount: 15, asset: '/game-assets/cauca/3.png', sortOrder: 0 },
];

// Độ sâu hồ (admin thêm/sửa được). minRodTier = cần bậc tối thiểu; catchRate = % bắt được.
export interface FishDepthSeed { depth: number; name: string; minRodTier: number; catchRate: number; sortOrder: number }
export const FISH_DEPTHS: FishDepthSeed[] = [
  { depth: 1, name: 'Nước nông', minRodTier: 1, catchRate: 85, sortOrder: 0 },
  { depth: 2, name: 'Nước vừa', minRodTier: 2, catchRate: 70, sortOrder: 1 },
  { depth: 3, name: 'Nước sâu', minRodTier: 3, catchRate: 55, sortOrder: 2 },
];

// Cần câu (bậc càng cao câu được độ sâu càng lớn)
export interface FishingRodSeed { slug: string; name: string; tier: number; price: number; asset: string; sortOrder: number }
export const FISHING_RODS: FishingRodSeed[] = [
  { slug: 'can-tre', name: 'Cần tre', tier: 1, price: 2000, asset: '/game-assets/cauca/cancau1.png', sortOrder: 0 },
  { slug: 'can-carbon', name: 'Cần carbon', tier: 2, price: 8000, asset: '/game-assets/cauca/cancau2.png', sortOrder: 1 },
  { slug: 'can-may', name: 'Cần máy', tier: 3, price: 20000, asset: '/game-assets/cauca/cancau3.png', sortOrder: 2 },
];

// Thuyền (phải mua mới câu được; maxDepth = ra được tới độ sâu nào; capacity = sức chứa cá)
export interface FishingBoatSeed { slug: string; name: string; price: number; capacity: number; maxDepth: number; asset: string; sortOrder: number }
export const FISHING_BOATS: FishingBoatSeed[] = [
  { slug: 'thuyen-nan', name: 'Thuyền nan', price: 5000, capacity: 15, maxDepth: 2, asset: '', sortOrder: 0 },
  { slug: 'thuyen-may', name: 'Thuyền máy', price: 30000, capacity: 40, maxDepth: 3, asset: '', sortOrder: 1 },
];
