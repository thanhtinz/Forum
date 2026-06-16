// Import đồ ăn từ Avatar server (bảng foods) vào ConsumableTemplate. Chỉ mua bằng coin.
// percent_health -> restoreHealth, price -> priceCoin.
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const foods = [
    { slug: 'av-kem-que-socola', name: 'Kem que socola', description: 'Thơm mát', type: 'DRINK', restoreHealth: 20, priceCoin: 500, sortOrder: 20 },
    { slug: 'av-kem-que-dau', name: 'Kem que dâu', description: 'Hương vị đậm đà', type: 'DRINK', restoreHealth: 20, priceCoin: 500, sortOrder: 21 },
    { slug: 'av-kem-tuoi-socola', name: 'Kem tươi socola', description: 'Thơm ngon đặc biệt', type: 'DRINK', restoreHealth: 60, priceCoin: 1000, sortOrder: 22 },
    { slug: 'av-kem-tuoi-dau', name: 'Kem tươi dâu', description: 'Hương vị độc đáo', type: 'DRINK', restoreHealth: 60, priceCoin: 1000, sortOrder: 23 },
    { slug: 'av-banh-mi', name: 'Bánh mì', description: 'Bánh mì Sài Gòn', type: 'FOOD', restoreHealth: 20, restoreHunger: 30, priceCoin: 500, sortOrder: 24 },
    { slug: 'av-banh-mi-thit', name: 'Bánh mì thịt', description: 'Ngon rẻ', type: 'FOOD', restoreHealth: 60, restoreHunger: 60, priceCoin: 1000, sortOrder: 25 },
    { slug: 'av-hamburger-trung', name: 'Hamburger trứng', description: 'Thơm ngon kỳ lạ', type: 'FOOD', restoreHealth: 80, restoreHunger: 80, priceCoin: 1500, sortOrder: 26 },
    { slug: 'av-hamburger-bo', name: 'Hamburger bò', description: 'Đẳng cấp là đây', type: 'FOOD', restoreHealth: 100, restoreHunger: 100, priceCoin: 2000, sortOrder: 27 },
    { slug: 'av-xuc-xich', name: 'Xúc xích', description: 'Hương bắp thơm ngon', type: 'FOOD', restoreHealth: 20, restoreHunger: 25, priceCoin: 500, sortOrder: 28 },
    { slug: 'av-thuc-an-hon-hop', name: 'Thức ăn hỗn hợp', description: 'Đầy đủ năng lượng', type: 'FOOD', restoreHealth: 50, restoreEnergy: 30, priceCoin: 1000, sortOrder: 29 },
    { slug: 'av-sua-tuoi', name: 'Sữa tươi', description: 'Không thể cưỡng lại', type: 'DRINK', restoreHealth: 100, restoreThirst: 50, priceCoin: 1500, sortOrder: 30 },
  ];

  for (const f of foods) {
    await prisma.consumableTemplate.upsert({
      where: { slug: f.slug },
      update: f as never,
      create: f as never,
    });
  }
  console.log(`Imported ${foods.length} foods từ Avatar`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
