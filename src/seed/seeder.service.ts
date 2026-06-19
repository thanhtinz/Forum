import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AvatarSlot, ConsumableType, MinigameType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FISH_SPECIES, FISH_DEPTHS, FISHING_RODS, FISHING_BOATS } from './data/fishing.data';
import { CROPS, FERTILIZERS, ANIMALS, RECIPES } from './data/farm.data';
import { FOODS } from './data/foods.data';
import { WARDROBE_ITEMS } from './data/wardrobe.data';
import { TOOL_CATEGORIES, TOOLS } from './data/tools.data';
import { AI_CHARACTER, AI_OUTFITS } from './data/ai-character.data';
import { DEFAULT_GROUPS } from '../modules/permissions/permission.service';
import { AdminConfigService } from '../modules/admin/admin-config.service';

// Tự seed dữ liệu mẫu (cá/cây/phân/vật nuôi/công thức/đồ ăn/wardrobe) khi app khởi động.
// Data nằm thẳng trong src/seed/data — không cần chạy lệnh seed thủ công.
// Tắt bằng env AUTO_SEED=false.
@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminConfig: AdminConfigService,
  ) {}

  async onApplicationBootstrap() {
    if (process.env.AUTO_SEED === 'false') return;
    try {
      await this.seedAll();
    } catch (e) {
      // Không chặn app nếu DB chưa migrate — chỉ cảnh báo
      this.logger.warn(`Auto-seed bỏ qua: ${(e as Error).message}`);
    }
  }

  private async seedAll() {
    let n = 0;

    // Nhóm cấu hình hệ thống (AI, Thanh toán, Media...) — admin chỉnh trong UI.
    // upsert giữ nguyên value admin đã đặt, chỉ thêm key/nhóm mới.
    await this.adminConfig.seedDefaults();

    // Nhóm hệ thống + bộ quyền (Flarum-style). Cập nhật tên/màu nhưng giữ permissions nếu admin đã sửa.
    for (const g of DEFAULT_GROUPS) {
      await this.prisma.userGroup.upsert({
        where: { key: g.key },
        update: { name: g.name, color: g.color, priority: g.priority, isSystem: true },
        create: { key: g.key, name: g.name, color: g.color, priority: g.priority, isSystem: true, permissions: g.permissions },
      });
      n++;
    }

    // Bọc từng phần để 1 lỗi không chặn các phần seed sau (vd: icon/minigame không cập nhật)
    try {
      // update: {} -> chỉ thêm khi thiếu, KHÔNG ghi đè dữ liệu admin đã sửa
      for (const f of FISH_SPECIES) {
        await this.prisma.fishSpecies.upsert({
          where: { slug: f.slug },
          update: {},
          create: { ...f, stock: f.refillCount },
        });
        n++;
      }
      // Độ sâu hồ + cần câu + thuyền (admin sửa được sau)
      for (const d of FISH_DEPTHS) {
        await this.prisma.fishDepth.upsert({ where: { depth: d.depth }, update: {}, create: d });
        n++;
      }
      for (const r of FISHING_RODS) {
        await this.prisma.fishingRod.upsert({ where: { slug: r.slug }, update: {}, create: r });
        n++;
      }
      for (const b of FISHING_BOATS) {
        await this.prisma.fishingBoat.upsert({ where: { slug: b.slug }, update: {}, create: b });
        n++;
      }
    } catch (e) { this.logger.warn(`Seed fishSpecies lỗi: ${(e as Error).message}`); }

    try {
      for (const c of CROPS) {
        await this.prisma.cropTemplate.upsert({ where: { slug: c.slug }, update: {}, create: c });
        n++;
      }
      for (const fz of FERTILIZERS) {
        await this.prisma.fertilizerTemplate.upsert({ where: { slug: fz.slug }, update: {}, create: fz });
        n++;
      }
      for (const a of ANIMALS) {
        await this.prisma.animalTemplate.upsert({ where: { slug: a.slug }, update: {}, create: a });
        n++;
      }
    } catch (e) { this.logger.warn(`Seed farm lỗi: ${(e as Error).message}`); }

    // ── Minigame configs (nếu thiếu sẽ báo "Game không khả dụng") ──
    const MINIGAMES: { type: MinigameType; name: string; minBet: number; maxBet: number; minPlayers: number; maxPlayers: number; sortOrder: number }[] = [
      { type: 'TAI_XIU', name: 'Tài Xỉu', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 0 },
      { type: 'BAU_CUA', name: 'Bầu Cua', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 1 },
      { type: 'COIN_FLIP', name: 'Tung Xu', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 2 },
      { type: 'LUCKY_WHEEL', name: 'Vòng Quay', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 3 },
      { type: 'DUA_THU', name: 'Đua Thú', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 4 },
      { type: 'JACKPOT_777', name: 'Jackpot 777', minBet: 100, maxBet: 20000, minPlayers: 1, maxPlayers: 1, sortOrder: 5 },
      { type: 'BLACKJACK', name: 'Blackjack', minBet: 100, maxBet: 50000, minPlayers: 1, maxPlayers: 1, sortOrder: 6 },
      { type: 'POKER', name: 'Poker', minBet: 100, maxBet: 50000, minPlayers: 2, maxPlayers: 6, sortOrder: 7 },
      { type: 'TIEN_LEN', name: 'Tiến Lên', minBet: 100, maxBet: 50000, minPlayers: 2, maxPlayers: 4, sortOrder: 8 },
      { type: 'CARO', name: 'Cờ Caro', minBet: 100, maxBet: 50000, minPlayers: 2, maxPlayers: 2, sortOrder: 9 },
    ];
    try {
      const PORTAL_GAMES = [
        { slug: 'nhat-kiem-mon', name: 'Nhất Kiếm Môn', publisher: 'SohaGame', genre: 'Nhập vai', shortDesc: 'Tinh Hoa Thế Giới Kiếm Hiệp Nhập Vai', featured: true, sortOrder: 0 },
        { slug: '3q-sieu-hung', name: '3Q Siêu Hùng', publisher: 'SohaGame', genre: 'Thẻ tướng', shortDesc: '3Q Siêu Hùng – Game AFK – X3 Sức Mạnh', featured: true, sortOrder: 1 },
        { slug: 'sieu-chien-binh', name: 'Siêu Chiến Binh', publisher: 'GGames', genre: 'Casual', shortDesc: 'Game đối kháng casual', featured: true, sortOrder: 2 },
        { slug: 'tay-du-phuc-ma', name: 'Tây Du Phục Ma', publisher: 'GGames', genre: 'Nhập vai', shortDesc: 'Tu tiên phục ma', sortOrder: 3 },
      ];
      for (const g of PORTAL_GAMES) {
        await this.prisma.portalGame.upsert({ where: { slug: g.slug }, update: {}, create: g });
        n++;
      }
    } catch (e) { this.logger.warn(`Seed portalGame lỗi: ${(e as Error).message}`); }

    try {
      for (const m of MINIGAMES) {
        await this.prisma.minigameConfig.upsert({
          where: { type: m.type },
          update: { name: m.name, isActive: true },
          create: { ...m, houseFee: 0.05, isActive: true },
        });
        n++;
      }
    } catch (e) { this.logger.warn(`Seed minigame lỗi: ${(e as Error).message}`); }
    for (const r of RECIPES) {
      const { ingredients, ...data } = r;
      // Giữ nguyên công thức admin đã sửa: chỉ tạo mới + seed nguyên liệu khi recipe chưa tồn tại
      const existing = await this.prisma.recipeTemplate.findUnique({ where: { slug: r.slug }, select: { id: true } });
      if (existing) { n++; continue; }
      const recipe = await this.prisma.recipeTemplate.create({ data });
      for (const i of ingredients) {
        await this.prisma.recipeIngredient.create({
          data: { recipeId: recipe.id, cropSlug: i.slug, name: i.name, quantity: i.quantity },
        });
      }
      n++;
    }

    for (const food of FOODS) {
      const data = { ...food, type: food.type as ConsumableType };
      await this.prisma.consumableTemplate.upsert({ where: { slug: food.slug }, update: {}, create: data });
      n++;
    }

    for (const w of WARDROBE_ITEMS) {
      const data = { ...w, slot: w.slot as AvatarSlot };
      await this.prisma.avatarItemTemplate.upsert({ where: { slug: w.slug }, update: data, create: data });
      n++;
    }

    // Tools Collection
    const catId = new Map<string, string>();
    for (const c of TOOL_CATEGORIES) {
      const cat = await this.prisma.toolCategory.upsert({
        where: { slug: c.slug },
        update: { name: c.name, description: c.description, icon: c.icon, sortOrder: c.sortOrder },
        create: { name: c.name, description: c.description, icon: c.icon, sortOrder: c.sortOrder, slug: c.slug },
      });
      catId.set(c.slug, cat.id);
      n++;
    }
    for (const t of TOOLS) {
      const categoryId = catId.get(t.categorySlug);
      if (!categoryId) continue;
      const data = {
        categoryId, name: t.name, description: t.description, icon: t.icon,
        component: t.component, isPro: t.isPro ?? false, sortOrder: t.sortOrder,
      };
      await this.prisma.tool.upsert({ where: { slug: t.slug }, update: data, create: { ...data, slug: t.slug } });
      n++;
    }

    // ── Nhân vật AI Live2D + trang phục mở dần theo bond ──
    const character = await this.prisma.aiCharacter.upsert({
      where: { slug: AI_CHARACTER.slug },
      update: {
        name: AI_CHARACTER.name, description: AI_CHARACTER.description,
        defaultOutfit: AI_CHARACTER.defaultOutfit, emotionMap: AI_CHARACTER.emotionMap,
        sortOrder: AI_CHARACTER.sortOrder,
      },
      create: {
        slug: AI_CHARACTER.slug, name: AI_CHARACTER.name, description: AI_CHARACTER.description,
        defaultOutfit: AI_CHARACTER.defaultOutfit, emotionMap: AI_CHARACTER.emotionMap,
        sortOrder: AI_CHARACTER.sortOrder,
      },
    });
    n++;
    for (const o of AI_OUTFITS) {
      const data = { ...o, isDefault: o.slug === AI_CHARACTER.defaultOutfit };
      await this.prisma.aiOutfit.upsert({
        where: { characterId_slug: { characterId: character.id, slug: o.slug } },
        update: data,
        create: { ...data, characterId: character.id },
      });
      n++;
    }
    // Persona mặc định (tạo nếu chưa có) + gắn vào character này để chat tích bond
    const existingPersona = await this.prisma.aiPersona.findFirst({ where: { isDefault: true } });
    if (!existingPersona) {
      await this.prisma.aiPersona.create({
        data: {
          name: 'Minori',
          systemPrompt:
            'Bạn là Minori, một trợ lý AI anime dễ thương và thân thiện của diễn đàn.\n' +
            'Bạn nói tiếng Việt, vui vẻ, hay giúp đỡ thành viên về các vấn đề kỹ thuật, lập trình, game.\n' +
            'Tính cách: năng động, đáng yêu, đôi khi nghịch ngợm nhưng luôn nhiệt tình giúp đỡ.',
          provider: 'GEMINI',
          modelId: 'gemini-2.0-flash',
          greetingText: 'Xin chào! Mình là Minori~ Có gì mình giúp được không nè? 🌸',
          live2dModel: AI_OUTFITS[0].modelPath,
          isDefault: true,
          isActive: true,
          characterId: character.id,
        },
      });
      n++;
    } else {
      await this.prisma.aiPersona.updateMany({
        where: { isDefault: true, characterId: null },
        data: { characterId: character.id },
      });
    }

    // ── Huy hiệu mốc mặc định (milestone badges, isAuto) ──
    const DEFAULT_BADGES = [
      { id: 'badge-first-post', name: 'Bài viết đầu tiên', icon: 'PenLine', color: 'green', condition: { type: 'postCount', gte: 1 } },
      { id: 'badge-active-100', name: 'Cây bút năng nổ', icon: 'Pen', color: 'blue', condition: { type: 'postCount', gte: 100 } },
      { id: 'badge-rep-1000', name: 'Uy tín ngàn điểm', icon: 'Gem', color: 'violet', condition: { type: 'reputationScore', gte: 1000 } },
      { id: 'badge-threads-50', name: 'Người mở chuyện', icon: 'MessageSquare', color: 'amber', condition: { type: 'threadCount', gte: 50 } },
    ];
    for (const b of DEFAULT_BADGES) {
      const data = { name: b.name, icon: b.icon, color: b.color, condition: b.condition, isAuto: true };
      await this.prisma.badge.upsert({
        where: { id: b.id },
        update: data,
        create: { id: b.id, ...data },
      });
      n++;
    }

    // ── Cấp độ mặc định (level tiers) ──
    const DEFAULT_LEVELS = [
      { level: 1, name: 'Tân binh', icon: 'Sprout', color: 'green', minScore: 0 },
      { level: 2, name: 'Thành viên', icon: 'Leaf', color: 'gray', minScore: 50 },
      { level: 3, name: 'Năng nổ', icon: 'Star', color: 'blue', minScore: 200 },
      { level: 4, name: 'Kỳ cựu', icon: 'Award', color: 'violet', minScore: 600 },
      { level: 5, name: 'Lão làng', icon: 'Crown', color: 'amber', minScore: 1500 },
      { level: 6, name: 'Huyền thoại', icon: 'Trophy', color: 'red', minScore: 4000 },
    ];
    for (const t of DEFAULT_LEVELS) {
      const data = { name: t.name, icon: t.icon, color: t.color, minScore: t.minScore };
      await this.prisma.levelTier.upsert({
        where: { level: t.level },
        update: data,
        create: { level: t.level, ...data },
      });
      n++;
    }

    this.logger.log(`Auto-seed hoàn tất: ${n} bản ghi template`);
  }
}
