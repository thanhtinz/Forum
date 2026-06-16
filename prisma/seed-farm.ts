// Seed dữ liệu nông trại (cây trồng, phân bón, vật nuôi, công thức bếp). Chỉ coin.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const img = (p: string) => `/game-assets/nongtrai/${p}`;

async function main() {
  // ── Cây trồng (ID asset theo product/sv1 gốc) ──
  const crops = [
    { slug: 'lua', name: 'Lúa', seedPrice: 50, sellPrice: 12, growSeconds: 300, exp: 5, yieldMin: 8, yieldMax: 14, reqLevel: 0, asset: img('img/sv1/12.png'), sortOrder: 0 },
    { slug: 'ca-chua', name: 'Cà chua', seedPrice: 120, sellPrice: 25, growSeconds: 600, exp: 8, yieldMin: 6, yieldMax: 10, reqLevel: 0, asset: img('img/sv1/1.png'), sortOrder: 1 },
    { slug: 'toi', name: 'Tỏi', seedPrice: 200, sellPrice: 40, growSeconds: 900, exp: 12, yieldMin: 5, yieldMax: 9, reqLevel: 1, asset: img('img/sv1/16.png'), sortOrder: 2 },
    { slug: 'nho', name: 'Nho', seedPrice: 400, sellPrice: 70, growSeconds: 1800, exp: 20, yieldMin: 6, yieldMax: 12, reqLevel: 3, asset: img('img/sv1/10.png'), sortOrder: 3 },
    { slug: 'thanh-long', name: 'Thanh long', seedPrice: 600, sellPrice: 95, growSeconds: 2400, exp: 28, yieldMin: 5, yieldMax: 10, reqLevel: 5, asset: img('img/sv1/6.png'), sortOrder: 4 },
    { slug: 'xoai', name: 'Xoài', seedPrice: 900, sellPrice: 140, growSeconds: 3600, exp: 40, yieldMin: 5, yieldMax: 9, reqLevel: 8, asset: img('img/sv1/7.png'), sortOrder: 5 },
    { slug: 'dua-hau', name: 'Dưa hấu', seedPrice: 1300, sellPrice: 200, growSeconds: 5400, exp: 60, yieldMin: 4, yieldMax: 8, reqLevel: 12, asset: img('img/sv1/11.png'), sortOrder: 6 },
  ];
  for (const c of crops) {
    await prisma.cropTemplate.upsert({ where: { slug: c.slug }, update: c, create: c });
  }

  // ── Phân bón (udobr 1-5): giảm thời gian chín ──
  const ferts = [
    { slug: 'phan-1', name: 'Phân hữu cơ', price: 200, reduceSeconds: 120, asset: img('img/udobr/1.png'), sortOrder: 0 },
    { slug: 'phan-2', name: 'Phân NPK', price: 500, reduceSeconds: 300, asset: img('img/udobr/2.png'), sortOrder: 1 },
    { slug: 'phan-3', name: 'Phân vi sinh', price: 1000, reduceSeconds: 600, asset: img('img/udobr/3.png'), sortOrder: 2 },
    { slug: 'phan-4', name: 'Phân cao cấp', price: 2000, reduceSeconds: 1200, asset: img('img/udobr/4.png'), sortOrder: 3 },
    { slug: 'phan-5', name: 'Phân thần kỳ', price: 4000, reduceSeconds: 2400, asset: img('img/udobr/5.png'), sortOrder: 4 },
  ];
  for (const f of ferts) {
    await prisma.fertilizerTemplate.upsert({ where: { slug: f.slug }, update: f, create: f });
  }

  // ── Vật nuôi (50-54) ──
  const day = 86400;
  const animals = [
    { slug: 'ga', name: 'Gà', buyPrice: 3000, growSeconds: 3600, lifeSeconds: 7 * day, feedCooldownSec: 4200, starveSeconds: day, productSlug: 'trung', productName: 'Trứng', productYield: 2, productPrice: 80, sellGrown: 1500, sellYoung: 500, asset: img('vatnuoi/trung.png'), sortOrder: 0 },
    { slug: 'lon', name: 'Lợn', buyPrice: 5000, growSeconds: 7200, lifeSeconds: 7 * day, feedCooldownSec: 7200, starveSeconds: day, productSlug: null, productName: null, productYield: 0, productPrice: 0, sellGrown: 9000, sellYoung: 2500, asset: img('vatnuoi/50.gif'), sortOrder: 1 },
    { slug: 'bo', name: 'Bò sữa', buyPrice: 20000, growSeconds: 10800, lifeSeconds: 10 * day, feedCooldownSec: 7200, starveSeconds: day, productSlug: 'sua-bo', productName: 'Sữa bò', productYield: 2, productPrice: 300, sellGrown: 25000, sellYoung: 8000, asset: img('vatnuoi/suabo.png'), sortOrder: 2 },
    { slug: 'cuu', name: 'Cừu', buyPrice: 18000, growSeconds: 10800, lifeSeconds: 10 * day, feedCooldownSec: 7200, starveSeconds: day, productSlug: 'long-cuu', productName: 'Lông cừu', productYield: 2, productPrice: 250, sellGrown: 22000, sellYoung: 7000, asset: img('vatnuoi/longcuu.png'), sortOrder: 3 },
    { slug: 'ca-nuoi', name: 'Cá nuôi', buyPrice: 4000, growSeconds: 7200, lifeSeconds: 7 * day, feedCooldownSec: 7200, starveSeconds: day, productSlug: null, productName: null, productYield: 0, productPrice: 0, sellGrown: 7000, sellYoung: 2000, asset: img('vatnuoi/54.gif'), sortOrder: 4 },
  ];
  for (const a of animals) {
    await prisma.animalTemplate.upsert({ where: { slug: a.slug }, update: a, create: a });
  }

  // ── Công thức nhà bếp ──
  const recipes = [
    { slug: 'com-trang', name: 'Cơm trắng', cookSeconds: 300, reward: 250, skillExp: 0, needSkill: false, reqLevel: 0, asset: img('nhabep/1.png'), sortOrder: 0, ings: [{ slug: 'lua', name: 'Lúa', quantity: 5 }] },
    { slug: 'salad', name: 'Salad cà chua', cookSeconds: 480, reward: 400, skillExp: 0, needSkill: false, reqLevel: 0, asset: img('nhabep/2.png'), sortOrder: 1, ings: [{ slug: 'ca-chua', name: 'Cà chua', quantity: 4 }, { slug: 'toi', name: 'Tỏi', quantity: 2 }] },
    { slug: 'trung-chien', name: 'Trứng chiên', cookSeconds: 360, reward: 500, skillExp: 0, needSkill: false, reqLevel: 0, asset: img('nhabep/3.png'), sortOrder: 2, ings: [{ slug: 'trung', name: 'Trứng', quantity: 3 }] },
    { slug: 'sua-chua', name: 'Sữa chua', cookSeconds: 900, reward: 1200, skillExp: 500, needSkill: true, reqLevel: 5, asset: img('nhabep/4.png'), sortOrder: 3, ings: [{ slug: 'sua-bo', name: 'Sữa bò', quantity: 3 }] },
    { slug: 'banh-nho', name: 'Bánh nho', cookSeconds: 1200, reward: 1800, skillExp: 800, needSkill: true, reqLevel: 8, asset: img('nhabep/5.png'), sortOrder: 4, ings: [{ slug: 'nho', name: 'Nho', quantity: 6 }, { slug: 'trung', name: 'Trứng', quantity: 2 }] },
  ];
  for (const r of recipes) {
    const { ings, ...data } = r;
    const recipe = await prisma.recipeTemplate.upsert({ where: { slug: r.slug }, update: data, create: data });
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
    for (const i of ings) {
      await prisma.recipeIngredient.create({ data: { recipeId: recipe.id, cropSlug: i.slug, name: i.name, quantity: i.quantity } });
    }
  }

  console.log(`Seeded farm: ${crops.length} crops, ${ferts.length} fertilizers, ${animals.length} animals, ${recipes.length} recipes`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
