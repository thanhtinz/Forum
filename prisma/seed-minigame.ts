// Seed Minigame configs (chỉ coin)
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const games = [
    { type: 'JACKPOT_777', name: 'Jackpot 777', description: 'Máy quay slot 3x3, 5 dòng thắng. Ra 777 trúng độc đắc!', minBet: 100, maxBet: 50000, houseFee: 0.05, maxPlayers: 1, minPlayers: 1, sortOrder: 0,
      assetConfig: {
        symbols: [
          { slug: 'cherry', name: 'Cherry', image: '/game-assets/jackpot/cherry.png' },
          { slug: 'lemon', name: 'Chanh', image: '/game-assets/jackpot/lemon.png' },
          { slug: 'bell', name: 'Chuông', image: '/game-assets/jackpot/bell.png' },
          { slug: 'bar', name: 'BAR', image: '/game-assets/jackpot/bar.png' },
          { slug: 'coin', name: 'Đồng Xu', image: '/game-assets/jackpot/coin.png' },
          { slug: 'seven', name: 'Số 7', image: '/game-assets/jackpot/seven.png' },
        ],
        reels: 3, rows: 3,
      },
    },
    { type: 'TAI_XIU', name: 'Tài Xỉu', description: '3 xúc xắc, cược Tài (11-17) hoặc Xỉu (4-10)', minBet: 100, maxBet: 100000, houseFee: 0.05, maxPlayers: 1, minPlayers: 1, sortOrder: 1 },
    { type: 'BAU_CUA', name: 'Bầu Cua Tôm Cá', description: 'Cược vào 6 con: bầu, cua, tôm, cá, gà, nai', minBet: 100, maxBet: 50000, houseFee: 0.05, maxPlayers: 1, minPlayers: 1, sortOrder: 2,
      assetConfig: {
        symbols: [
          { slug: 'bau', name: 'Bầu', image: '/game-assets/baucua/bau.png' },
          { slug: 'cua', name: 'Cua', image: '/game-assets/baucua/cua.png' },
          { slug: 'tom', name: 'Tôm', image: '/game-assets/baucua/tom.png' },
          { slug: 'ca', name: 'Cá', image: '/game-assets/baucua/ca.png' },
          { slug: 'ga', name: 'Gà', image: '/game-assets/baucua/ga.png' },
          { slug: 'nai', name: 'Nai', image: '/game-assets/baucua/nai.png' },
        ],
      },
    },
    { type: 'LUCKY_WHEEL', name: 'Vòng Quay May Mắn', description: 'Quay vòng, nhân x0 đến x10', minBet: 100, maxBet: 20000, houseFee: 0.05, maxPlayers: 1, minPlayers: 1, sortOrder: 3 },
    { type: 'COIN_FLIP', name: 'Tung Đồng Xu', description: 'Sấp hay ngửa, x2 nếu đúng', minBet: 100, maxBet: 100000, houseFee: 0.05, maxPlayers: 1, minPlayers: 1, sortOrder: 4 },
    { type: 'BLACKJACK', name: 'Xì Dách (Blackjack)', description: 'Đấu với nhà cái, gần 21 nhất thắng', minBet: 500, maxBet: 200000, houseFee: 0.03, maxPlayers: 1, minPlayers: 1, sortOrder: 5,
      assetConfig: { deck: '/game-assets/cards', note: '52 lá bích/chuồng/rô/cơ' } },
    { type: 'POKER', name: 'Poker', description: 'Texas Holdem với người chơi khác', minBet: 1000, maxBet: 500000, houseFee: 0.05, maxPlayers: 6, minPlayers: 2, sortOrder: 6,
      assetConfig: { deck: '/game-assets/cards' } },
    { type: 'TIEN_LEN', name: 'Tiến Lên Miền Nam', description: 'Game bài Việt Nam phổ biến', minBet: 500, maxBet: 100000, houseFee: 0.05, maxPlayers: 4, minPlayers: 2, sortOrder: 7,
      assetConfig: { deck: '/game-assets/cards' } },
    { type: 'CARO', name: 'Cờ Caro', description: '5 quân liên tiếp thắng, đấu 1v1', minBet: 500, maxBet: 50000, houseFee: 0.05, maxPlayers: 2, minPlayers: 2, sortOrder: 8 },
    { type: 'DUA_THU', name: 'Đua Thú', description: 'Cược con thú về đích đầu tiên', minBet: 200, maxBet: 50000, houseFee: 0.06, maxPlayers: 1, minPlayers: 1, sortOrder: 9 },
  ];

  for (const g of games) {
    await prisma.minigameConfig.upsert({
      where: { type: g.type as any },
      update: {},
      create: g as any,
    });
  }
  console.log(`✓ ${games.length} minigames (chỉ COIN)`);

  // Sticker pack mẫu
  const pack = await prisma.stickerPack.upsert({
    where: { slug: 'default-emotes' },
    update: {},
    create: {
      slug: 'default-emotes',
      name: 'Cảm Xúc Cơ Bản',
      description: 'Bộ sticker cảm xúc miễn phí',
      isPremium: false,
      stickers: {
        create: [
          { name: 'Vui', imageUrl: '/stickers/default/happy.png', sortOrder: 0 },
          { name: 'Buồn', imageUrl: '/stickers/default/sad.png', sortOrder: 1 },
          { name: 'Cười', imageUrl: '/stickers/default/laugh.png', sortOrder: 2 },
          { name: 'Khóc', imageUrl: '/stickers/default/cry.png', sortOrder: 3 },
        ],
      },
    },
  });
  console.log('✓ Default sticker pack');
  console.log('🎰 Minigame seed complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
