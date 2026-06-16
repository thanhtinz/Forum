// Seed loài cá cho 3 khu câu cá (chỉ coin). Giá trị viết lại từ mod gốc.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const species = [
    // Khu 1 — dễ, giá thấp
    { zone: 1, slug: 'ca-ro', name: 'Cá rô', kgMin: 1, kgMax: 3, pricePerKg: 50, refillCount: 70, asset: '/game-assets/cauca/1.png', sortOrder: 0 },
    // Khu 2 — trung bình
    { zone: 2, slug: 'ca-long-tong', name: 'Cá lòng tong', kgMin: 2, kgMax: 6, pricePerKg: 120, refillCount: 40, asset: '/game-assets/cauca/2.png', sortOrder: 0 },
    // Khu 3 — hiếm, giá cao
    { zone: 3, slug: 'ca-map', name: 'Cá mập', kgMin: 8, kgMax: 25, pricePerKg: 400, refillCount: 15, asset: '/game-assets/cauca/3.png', sortOrder: 0 },
  ];

  for (const s of species) {
    await prisma.fishSpecies.upsert({
      where: { slug: s.slug },
      update: { ...s, stock: s.refillCount },
      create: { ...s, stock: s.refillCount },
    });
  }

  console.log(`Seeded ${species.length} fish species`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
