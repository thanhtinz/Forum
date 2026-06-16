// Seed Consumables + Special Items + Trophies + Titles
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // ── Consumables (thức ăn/nước/thuốc) ──
  const consumables = [
    { slug: 'bread', name: 'Bánh Mì', type: 'FOOD', restoreHunger: 30, priceCoin: 50, sortOrder: 1 },
    { slug: 'meal', name: 'Cơm Đầy Đủ', type: 'FOOD', restoreHunger: 70, restoreHealth: 10, priceCoin: 150, sortOrder: 2 },
    { slug: 'feast', name: 'Đại Tiệc', type: 'FOOD', restoreHunger: 100, restoreHealth: 20, priceCoin: null, priceGem: 10, sortOrder: 3 },
    { slug: 'water', name: 'Nước Lọc', type: 'DRINK', restoreThirst: 40, priceCoin: 30, sortOrder: 4 },
    { slug: 'juice', name: 'Nước Ép', type: 'DRINK', restoreThirst: 70, restoreEnergy: 10, priceCoin: 100, sortOrder: 5 },
    { slug: 'energy-drink', name: 'Nước Tăng Lực', type: 'DRINK', restoreThirst: 50, restoreEnergy: 40, priceCoin: 200, sortOrder: 6 },
    { slug: 'medicine', name: 'Thuốc Cảm', type: 'MEDICINE', restoreHealth: 30, curesSickness: true, priceCoin: 300, sortOrder: 7 },
    { slug: 'super-potion', name: 'Tiên Đan', type: 'MEDICINE', restoreHealth: 100, curesSickness: true, priceCoin: null, priceGem: 25, sortOrder: 8 },
    { slug: 'soap', name: 'Xà Phòng', type: 'HYGIENE_ITEM', restoreHygiene: 60, priceCoin: 40, sortOrder: 9 },
    { slug: 'coffee', name: 'Cà Phê', type: 'ENERGY_ITEM', restoreEnergy: 50, restoreThirst: 20, priceCoin: 120, sortOrder: 10 },
  ];
  for (const c of consumables) {
    await prisma.consumableTemplate.upsert({ where: { slug: c.slug }, update: {}, create: c as any });
  }
  console.log(`✓ ${consumables.length} consumables`);

  // ── Special Items (thẻ đổi tên, nổi bật tên...) ──
  const specials = [
    { slug: 'rename-card', name: 'Thẻ Đổi Tên', type: 'RENAME_CARD', description: 'Cho phép đổi tên đăng nhập 1 lần', priceCoin: null, priceGem: 50, sortOrder: 1 },
    { slug: 'name-glow', name: 'Tên Phát Sáng', type: 'NAME_HIGHLIGHT', description: 'Tên có hiệu ứng phát sáng (30 ngày)', effectConfig: { style: 'glow' }, durationDays: 30, priceCoin: null, priceGem: 30, sortOrder: 2 },
    { slug: 'name-rainbow', name: 'Tên Cầu Vồng', type: 'NAME_HIGHLIGHT', description: 'Tên đổi màu cầu vồng (30 ngày)', effectConfig: { style: 'rainbow' }, durationDays: 30, priceCoin: null, priceGem: 60, sortOrder: 3 },
    { slug: 'name-gold', name: 'Tên Vàng', type: 'NAME_COLOR', description: 'Đổi màu tên thành vàng kim', effectConfig: { color: '#f59e0b' }, priceCoin: 5000, priceGem: 20, sortOrder: 4 },
    { slug: 'avatar-frame-dragon', name: 'Khung Rồng', type: 'AVATAR_FRAME', description: 'Khung avatar hình rồng', effectConfig: { frame: 'dragon' }, priceCoin: null, priceGem: 40, sortOrder: 5 },
    { slug: 'exp-boost-2x', name: 'Bùa EXP x2', type: 'EXP_BOOST', description: 'Tăng gấp đôi EXP nhận được (7 ngày)', effectConfig: { multiplier: 2 }, durationDays: 7, priceCoin: null, priceGem: 35, sortOrder: 6 },
  ];
  for (const s of specials) {
    await prisma.specialItemTemplate.upsert({ where: { slug: s.slug }, update: {}, create: s as any });
  }
  console.log(`✓ ${specials.length} special items`);

  // ── Trophies (danh hiệu kiểu XenForo) ──
  const trophies = [
    { slug: 'first-post', name: 'Bài Viết Đầu Tiên', description: 'Đăng bài viết đầu tiên', points: 1, criteria: { type: 'first_post' }, sortOrder: 1 },
    { slug: 'first-thread', name: 'Chủ Đề Đầu Tiên', description: 'Tạo chủ đề đầu tiên', points: 2, criteria: { type: 'first_thread' }, sortOrder: 2 },
    { slug: 'posts-10', name: 'Người Mới Năng Nổ', description: 'Đăng 10 bài viết', points: 5, criteria: { type: 'post_count', value: 10 }, sortOrder: 3 },
    { slug: 'posts-100', name: 'Thành Viên Tích Cực', description: 'Đăng 100 bài viết', points: 20, criteria: { type: 'post_count', value: 100 }, sortOrder: 4 },
    { slug: 'posts-1000', name: 'Cây Viết Kỳ Cựu', description: 'Đăng 1000 bài viết', points: 100, criteria: { type: 'post_count', value: 1000 }, sortOrder: 5 },
    { slug: 'likes-50', name: 'Được Yêu Thích', description: 'Nhận 50 lượt thích', points: 15, criteria: { type: 'reaction_received', value: 50 }, sortOrder: 6 },
    { slug: 'likes-500', name: 'Ngôi Sao Cộng Đồng', description: 'Nhận 500 lượt thích', points: 50, criteria: { type: 'reaction_received', value: 500 }, sortOrder: 7 },
    { slug: 'veteran-1y', name: 'Lão Làng', description: 'Tham gia 1 năm', points: 30, criteria: { type: 'days_registered', value: 365 }, sortOrder: 8 },
    { slug: 'level-10', name: 'Chiến Binh', description: 'Đạt cấp 10', points: 25, criteria: { type: 'level_reached', value: 10 }, sortOrder: 9 },
    { slug: 'pvp-100', name: 'Đấu Sĩ', description: 'Thắng 100 trận PvP', points: 40, criteria: { type: 'pvp_wins', value: 100 }, sortOrder: 10 },
    { slug: 'seller-10', name: 'Thương Gia', description: 'Bán 10 sản phẩm', points: 35, criteria: { type: 'products_sold', value: 10 }, sortOrder: 11 },
  ];
  for (const t of trophies) {
    await prisma.trophy.upsert({ where: { slug: t.slug }, update: {}, create: t as any });
  }
  console.log(`✓ ${trophies.length} trophies`);

  // ── User Title Ladder ──
  const titles = [
    { name: 'Thành Viên Mới', minPoints: 0, color: '#9ca3af' },
    { name: 'Thành Viên', minPoints: 10, color: '#22c55e' },
    { name: 'Thành Viên Tích Cực', minPoints: 30, color: '#3b82f6' },
    { name: 'Kỳ Cựu', minPoints: 75, color: '#a855f7' },
    { name: 'Huyền Thoại', minPoints: 150, color: '#f59e0b' },
    { name: 'Bậc Thầy', minPoints: 300, color: '#ef4444' },
  ];
  for (const t of titles) {
    const exists = await prisma.userTitle.findFirst({ where: { minPoints: t.minPoints } });
    if (!exists) await prisma.userTitle.create({ data: t });
  }
  console.log(`✓ ${titles.length} user titles`);

  console.log('🏆 Shop + Trophy seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
