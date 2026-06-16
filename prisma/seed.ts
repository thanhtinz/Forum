import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  // ── Categories (giống chiasemanguon.com) ──
  const categories = [
    { name: 'Thông Báo', slug: 'thong-bao', description: 'Thông báo chính thức và cập nhật', icon: 'bell', sortOrder: 1 },
    { name: 'Thảo Luận Chung', slug: 'thao-luan-chung', description: 'Các chủ đề và thảo luận chung', icon: 'message-circle', sortOrder: 2 },
    { name: 'Hướng Dẫn', slug: 'huong-dan', description: 'Hướng dẫn & tài liệu', icon: 'book-open', sortOrder: 3 },
    { name: 'Hỏi Đáp & Kỹ Thuật', slug: 'hoi-dap-ky-thuat', description: 'Đặt câu hỏi & nhận trợ giúp', icon: 'help-circle', sortOrder: 4 },
    { name: 'Showcase', slug: 'showcase', description: 'Giới thiệu dự án & sản phẩm', icon: 'star', sortOrder: 5 },
    { name: 'Feedback', slug: 'feedback', description: 'Phản hồi & đề xuất', icon: 'thumbs-up', sortOrder: 6 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`✓ ${categories.length} categories`);

  // ── Gem packages ──
  const packages = [
    { name: 'Gói Khởi Đầu', gemAmount: 100, priceVnd: 20000, priceUsd: 0.99, bonus: 0, sortOrder: 1 },
    { name: 'Gói Phổ Biến', gemAmount: 500, priceVnd: 90000, priceUsd: 3.99, bonus: 50, sortOrder: 2 },
    { name: 'Gói Tiết Kiệm', gemAmount: 1000, priceVnd: 170000, priceUsd: 6.99, bonus: 150, sortOrder: 3 },
    { name: 'Gói VIP', gemAmount: 5000, priceVnd: 800000, priceUsd: 32.99, bonus: 1000, sortOrder: 4 },
  ];

  for (const pkg of packages) {
    const exists = await prisma.gemPackage.findFirst({ where: { name: pkg.name } });
    if (!exists) await prisma.gemPackage.create({ data: pkg });
  }
  console.log(`✓ ${packages.length} gem packages`);

  // ── AI Persona mặc định ──
  const personaExists = await prisma.aiPersona.findFirst({ where: { isDefault: true } });
  if (!personaExists) {
    await prisma.aiPersona.create({
      data: {
        name: 'Minori',
        systemPrompt: `Bạn là Minori, một trợ lý AI anime dễ thương và thân thiện của diễn đàn.
Bạn nói tiếng Việt, vui vẻ, hay giúp đỡ thành viên về các vấn đề kỹ thuật, lập trình, game.
Tính cách: năng động, đáng yêu, đôi khi nghịch ngợm nhưng luôn nhiệt tình giúp đỡ.`,
        provider: 'GEMINI',
        modelId: 'gemini-2.0-flash',
        greetingText: 'Xin chào! Mình là Minori~ Có gì mình giúp được không nè? 🌸',
        live2dModel: '/models/minori/normal/05minori_normal_3.0_f_t05.model3.json',
        isDefault: true,
        isActive: true,
      },
    });
    console.log('✓ Default AI persona (Neko-chan)');
  }

  // ── Badges ──
  const badges = [
    { name: 'Thành viên mới', icon: 'user-plus', color: '#10b981', condition: { type: 'register', value: 1 } },
    { name: 'Người đóng góp', icon: 'pen', color: '#3b82f6', condition: { type: 'post_count', value: 50 } },
    { name: 'Chuyên gia', icon: 'award', color: '#f59e0b', condition: { type: 'post_count', value: 500 } },
    { name: 'Huyền thoại', icon: 'crown', color: '#ef4444', condition: { type: 'reputation', value: 1000 } },
  ];
  for (const badge of badges) {
    const exists = await prisma.badge.findFirst({ where: { name: badge.name } });
    if (!exists) await prisma.badge.create({ data: badge });
  }
  console.log(`✓ ${badges.length} badges`);

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
