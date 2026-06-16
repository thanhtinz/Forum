// Seed Level Curve + Item Templates + Skills cho RPG
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // ── Level Curve (1-50) ──
  // EXP forum tích lũy: đăng thread +10, post +5, được like +2
  for (let lv = 1; lv <= 50; lv++) {
    const expRequired = Math.floor(100 * Math.pow(lv, 1.5));
    await prisma.levelCurve.upsert({
      where: { level: lv },
      update: {},
      create: {
        level: lv,
        expRequired,
        statPointReward: 5,
        coinReward: lv * 50,
      },
    });
  }
  console.log('✓ Level curve 1-50');

  // ── Item Templates ──
  const items = [
    // Common weapons
    { slug: 'iron-sword', name: 'Kiếm Sắt', slot: 'WEAPON', rarity: 'COMMON', spriteUrl: '/sprites/iron-sword.png', reqLevel: 1, bonusAtk: 15, priceCoin: 500, priceGem: null },
    { slug: 'wood-staff', name: 'Gậy Gỗ', slot: 'WEAPON', rarity: 'COMMON', spriteUrl: '/sprites/wood-staff.png', reqLevel: 1, bonusInt: 12, priceCoin: 500, priceGem: null },
    // Common armor
    { slug: 'leather-armor', name: 'Giáp Da', slot: 'ARMOR', rarity: 'COMMON', spriteUrl: '/sprites/leather-armor.png', reqLevel: 1, bonusDef: 10, bonusHp: 50, priceCoin: 400, priceGem: null },
    { slug: 'cloth-pants', name: 'Quần Vải', slot: 'PANTS', rarity: 'COMMON', spriteUrl: '/sprites/cloth-pants.png', reqLevel: 1, bonusDef: 5, priceCoin: 300, priceGem: null },
    // Rare
    { slug: 'fire-sword', name: 'Kiếm Lửa', slot: 'WEAPON', rarity: 'RARE', spriteUrl: '/sprites/fire-sword.png', reqLevel: 10, bonusAtk: 45, bonusStr: 10, priceCoin: 5000, priceGem: 50 },
    { slug: 'steel-gloves', name: 'Găng Thép', slot: 'GLOVES', rarity: 'RARE', spriteUrl: '/sprites/steel-gloves.png', reqLevel: 8, bonusAtk: 20, bonusDef: 8, priceCoin: 3000, priceGem: 30 },
    // Epic
    { slug: 'dragon-cloak', name: 'Áo Choàng Rồng', slot: 'CLOAK', rarity: 'EPIC', spriteUrl: '/sprites/dragon-cloak.png', reqLevel: 20, bonusDef: 30, bonusHp: 200, priceCoin: null, priceGem: 120 },
    { slug: 'phoenix-boots', name: 'Giày Phượng', slot: 'BOOTS', rarity: 'EPIC', spriteUrl: '/sprites/phoenix-boots.png', reqLevel: 18, bonusAgi: 25, bonusHp: 100, priceCoin: null, priceGem: 100 },
    // Legendary
    { slug: 'shadow-skin', name: 'Skin Hắc Hiệp', slot: 'SKIN', rarity: 'LEGENDARY', spriteUrl: '/sprites/shadow-skin.png', reqLevel: 1, priceCoin: null, priceGem: 300 },
    // Mythic
    { slug: 'god-ring', name: 'Nhẫn Thần', slot: 'RING', rarity: 'MYTHIC', spriteUrl: '/sprites/god-ring.png', reqLevel: 30, bonusStr: 25, bonusInt: 25, bonusHp: 300, priceCoin: null, priceGem: 500 },
  ];

  for (const item of items) {
    await prisma.itemTemplate.upsert({
      where: { slug: item.slug },
      update: {},
      create: item as any,
    });
  }
  console.log(`✓ ${items.length} item templates`);

  // ── Skills ──
  const skills = [
    { slug: 'power-strike', name: 'Cường Kích', reqLevel: 1, manaCost: 10, cooldown: 2, damageMultiplier: 1.8, priceCoin: 1000, priceGem: null },
    { slug: 'fireball', name: 'Cầu Lửa', reqLevel: 5, manaCost: 20, cooldown: 3, damageMultiplier: 2.2, effectType: 'dot', effectValue: 10, priceCoin: 2000, priceGem: 20 },
    { slug: 'heal', name: 'Hồi Phục', reqLevel: 8, manaCost: 25, cooldown: 4, damageMultiplier: 0, effectType: 'heal', effectValue: 150, priceCoin: 3000, priceGem: 30 },
    { slug: 'stun-blow', name: 'Choáng', reqLevel: 12, manaCost: 30, cooldown: 5, damageMultiplier: 1.5, effectType: 'stun', effectValue: 1, priceCoin: null, priceGem: 50 },
  ];

  for (const skill of skills) {
    await prisma.skillTemplate.upsert({
      where: { slug: skill.slug },
      update: {},
      create: skill as any,
    });
  }
  console.log(`✓ ${skills.length} skills`);

  console.log('🎮 Game seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
