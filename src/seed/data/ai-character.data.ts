// Nhân vật AI Live2D "Minori" + 8 bộ trang phục mở dần theo độ thân thiết (bond level).
// Bond tăng mỗi khi user trò chuyện với AI; đạt mốc level sẽ tự mở outfit mới.

export const AI_CHARACTER = {
  slug: 'minori',
  name: 'Minori',
  description: 'Trợ lý AI anime của diễn đàn. Trò chuyện càng nhiều, thân thiết càng cao, mở thêm trang phục mới.',
  defaultOutfit: 'normal',
  // emotion (backend phát ra) → motion khuôn mặt của model (model không có Expressions)
  emotionMap: {
    neutral: 'face_normal_01', happy: 'face_smile_01', excited: 'face_sparkling_01',
    thinking: 'face_serious_01', surprised: 'face_surprise_01', shy: 'face_shy_01',
    sad: 'face_sad_01', wink: 'face_wink_01', angry: 'face_angry_01',
  } as Record<string, string>,
  sortOrder: 0,
};

interface OutfitSeed {
  slug: string; name: string; nameEn: string; modelPath: string;
  description: string; unlockBondLevel: number; rarity: string; sortOrder: number;
}

export const AI_OUTFITS: OutfitSeed[] = [
  { slug: 'normal', name: 'Thường ngày', nameEn: 'Casual', modelPath: '/models/minori/normal/05minori_normal_3.0_f_t05.model3.json', description: 'Trang phục mặc định.', unlockBondLevel: 0, rarity: 'common', sortOrder: 0 },
  { slug: 'culture', name: 'Đồng phục', nameEn: 'Uniform', modelPath: '/models/minori/culture/05minori_culture_t01.model3.json', description: 'Đồng phục học sinh.', unlockBondLevel: 1, rarity: 'common', sortOrder: 1 },
  { slug: 'sports02', name: 'Thể thao', nameEn: 'Sportswear', modelPath: '/models/minori/sports02/05minori_sports02.model3.json', description: 'Bộ đồ thể thao năng động.', unlockBondLevel: 2, rarity: 'common', sortOrder: 2 },
  { slug: 'parttime', name: 'Làm thêm', nameEn: 'Part-time', modelPath: '/models/minori/parttime/05minori_parttime_t03.model3.json', description: 'Trang phục làm thêm.', unlockBondLevel: 3, rarity: 'rare', sortOrder: 3 },
  { slug: 'cloth002', name: 'Váy dạo phố', nameEn: 'Dress', modelPath: '/models/minori/cloth002/05minori_cloth002_3.0_f_t04.model3.json', description: 'Váy dạo phố xinh xắn.', unlockBondLevel: 4, rarity: 'rare', sortOrder: 4 },
  { slug: 'unit', name: 'Đồng phục đặc biệt', nameEn: 'Unit', modelPath: '/models/minori/unit/05minori_unit_3.0_f_t02.model3.json', description: 'Trang phục phiên bản giới hạn.', unlockBondLevel: 5, rarity: 'rare', sortOrder: 5 },
  { slug: 'swimsuit', name: 'Đồ bơi', nameEn: 'Swimsuit', modelPath: '/models/minori/swimsuit/05minori_swimsuit.model3.json', description: 'Bộ đồ bơi mùa hè.', unlockBondLevel: 7, rarity: 'legendary', sortOrder: 6 },
  { slug: 'priestess', name: 'Miko', nameEn: 'Priestess', modelPath: '/models/minori/priestess/05minori_priestess_t02.model3.json', description: 'Trang phục miko thần xã — phần thưởng thân thiết cao nhất.', unlockBondLevel: 10, rarity: 'legendary', sortOrder: 7 },
];
