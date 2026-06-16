import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { AvatarSlot, ConsumableType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FISH_SPECIES } from './data/fishing.data';
import { CROPS, FERTILIZERS, ANIMALS, RECIPES } from './data/farm.data';
import { FOODS } from './data/foods.data';
import { WARDROBE_ITEMS } from './data/wardrobe.data';

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

    this.logger.log(`Auto-seed hoàn tất: ${n} bản ghi template`);
  }
}
