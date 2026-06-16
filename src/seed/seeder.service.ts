import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AvatarSlot, ConsumableType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FISH_SPECIES } from './data/fishing.data';
import { CROPS, FERTILIZERS, ANIMALS, RECIPES } from './data/farm.data';
import { FOODS } from './data/foods.data';
import { WARDROBE_ITEMS } from './data/wardrobe.data';
import { TOOL_CATEGORIES, TOOLS } from './data/tools.data';
import { AI_CHARACTER, AI_OUTFITS } from './data/ai-character.data';

// Tự seed dữ liệu mẫu (cá/cây/phân/vật nuôi/công thức/đồ ăn/wardrobe) khi app khởi động.
// Data nằm thẳng trong src/seed/data — không cần chạy lệnh seed thủ công.
// Tắt bằng env AUTO_SEED=false.
@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(private readonly prisma: PrismaService) {}

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

    for (const f of FISH_SPECIES) {
      await this.prisma.fishSpecies.upsert({
        where: { slug: f.slug },
        update: { ...f, stock: f.refillCount },
        create: { ...f, stock: f.refillCount },
      });
      n++;
    }

    for (const c of CROPS) {
      await this.prisma.cropTemplate.upsert({ where: { slug: c.slug }, update: c, create: c });
      n++;
    }
    for (const fz of FERTILIZERS) {
      await this.prisma.fertilizerTemplate.upsert({ where: { slug: fz.slug }, update: fz, create: fz });
      n++;
    }
    for (const a of ANIMALS) {
      await this.prisma.animalTemplate.upsert({ where: { slug: a.slug }, update: a, create: a });
      n++;
    }
    for (const r of RECIPES) {
      const { ingredients, ...data } = r;
      const recipe = await this.prisma.recipeTemplate.upsert({
        where: { slug: r.slug },
        update: data,
        create: data,
      });
      await this.prisma.recipeIngredient.deleteMany({ where: { recipeId: recipe.id } });
      for (const i of ingredients) {
        await this.prisma.recipeIngredient.create({
          data: { recipeId: recipe.id, cropSlug: i.slug, name: i.name, quantity: i.quantity },
        });
      }
      n++;
    }

    for (const food of FOODS) {
      const data = { ...food, type: food.type as ConsumableType };
      await this.prisma.consumableTemplate.upsert({ where: { slug: food.slug }, update: data, create: data });
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
      { id: 'badge-first-post', name: 'Bài viết đầu tiên', icon: '📝', color: 'green', condition: { type: 'postCount', gte: 1 } },
      { id: 'badge-active-100', name: 'Cây bút năng nổ', icon: '✍️', color: 'blue', condition: { type: 'postCount', gte: 100 } },
      { id: 'badge-rep-1000', name: 'Uy tín ngàn điểm', icon: '💎', color: 'violet', condition: { type: 'reputationScore', gte: 1000 } },
      { id: 'badge-threads-50', name: 'Người mở chuyện', icon: '🧵', color: 'amber', condition: { type: 'threadCount', gte: 50 } },
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

    this.logger.log(`Auto-seed hoàn tất: ${n} bản ghi template`);
  }
}
