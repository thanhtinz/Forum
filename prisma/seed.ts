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
        name: 'Trợ lý AI',
        systemPrompt: `Bạn là trợ lý AI của diễn đàn. Trả lời bằng tiếng Việt, ngắn gọn, hữu ích, lịch sự.`,
        provider: 'GEMINI',
        modelId: 'gemini-2.0-flash',
        isDefault: true,
        isActive: true,
      },
    });
    console.log('✓ Default AI persona');
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

  // ── Sticker Pack: Pepe ──
  const pepePack = await prisma.stickerPack.findUnique({ where: { slug: 'pepe' } });
  if (!pepePack) {
    const PEPE_URLS = [
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6b7d39cc8.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6b9d320ba.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6b9e01117.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6b9e71e38.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6b9f14c77.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6b9f778c3.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6b9fefa56.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba0971f9.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba1bda1f.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba25d632.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba300759.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba3903c6.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba40dd3b.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba464ac0.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba4c8b98.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba590d6c.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba65d85f.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba6dc653.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6ba801392.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6babec9d6.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6bb140f0f.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6bb1f3411.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6bb301d10.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6bb6040f0.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6bb76c9ff.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696b6bb7ad279.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba49fac7c9.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4a2a6847.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4a429cd3.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4a8f2739.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4a975358.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4ab68685.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4ac5d08c.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4ae048e0.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4b2b5344.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4b38fefe.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4b8d44f9.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4ba73500.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4bba04a9.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4bc0a094.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4bdb407a.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4bee1eac.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4c20cf57.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4c699341.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4c7308a9.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4c9283dd.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4c9ec280.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4cd0efc0.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4cde6d07.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4cef1149.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4d2a9823.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4d495b88.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4d55c0f1.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4d62eb12.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4d77d226.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4d99af81.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4da5843d.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4dc530a5.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4e0bb1d5.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4e1a5ab9.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4e28396f.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4e6da039.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4e88ea04.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4e95198d.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4ec06e17.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4eddaed0.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4ef1aa92.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4f026892.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4f15a287.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4f68c5cd.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4f8f0fcd.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4fa05eb4.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4fb04207.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696ba4fe2846f.gif',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbb22017ab.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc15e6c00.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc1700a9e.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc17cbd53.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc1857a72.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc18d1d41.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc1b5663c.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc1c0210a.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc1d6a499.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc1e29364.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc1f962fe.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc2022e10.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc2157a6b.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc21b4649.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc22e6568.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc236fa1c.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc23e26b1.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc25f14cb.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc26672c5.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc26dcfb3.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc279637b.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc28cdd0e.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc2a266b1.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc2a9160b.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc2bb9fde.webp',
      'https://hoathinh3d.co/wp-content/uploads/wpdiscuz-stickers/pepe/696bbc2dcb544.webp',
    ];
    await prisma.stickerPack.create({
      data: {
        slug: 'pepe',
        name: 'Pepe',
        description: 'Pack sticker Pepe meme tổng hợp',
        thumbnailUrl: PEPE_URLS[0],
        isActive: true,
        isPremium: false,
        sortOrder: 0,
        stickers: { create: PEPE_URLS.map((url, i) => ({ name: `pepe-${i + 1}`, imageUrl: url, sortOrder: i })) },
      },
    });
    console.log(`✓ Sticker pack Pepe (${PEPE_URLS.length} stickers)`);
  } else {
    console.log('✓ Sticker pack Pepe (đã tồn tại, bỏ qua)');
  }

  console.log('🎉 Seed complete!');
}

// ── Thể loại anime/manga/donghua/manhua ──
async function seedAnimeGenres() {
  const genres = [
    'Action','Adventure','Boys Love','Cartoon','Cổ Trang','Comedy','Dementia','Demons',
    'Drama','Ecchi','Fantasy','Game','Harem','Historical','Horror','Josei','Kids',
    'Live Action','Magic','Martial Arts','Mecha','Military','Music','Mystery','Parody',
    'Police','Psychological','Romance','Samurai','School','Sci-Fi','Seinen','Shoujo',
    'Shoujo Ai','Shounen','Shounen Ai','Slice of Life','Space','Sports','Super Power',
    'Supernatural','Suspense','Thriller','Tokusatsu','Vampire','Yaoi','Yuri',
  ];
  for (const name of genres) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    await prisma.genre.upsert({ where: { slug }, update: { name }, create: { name, slug } });
  }
  console.log(`✓ ${genres.length} anime genres`);
}

async function runAll() {
  await main();
  await seedAnimeGenres();
  await prisma.$disconnect();
}

runAll().catch((e) => { console.error(e); process.exit(1); });
