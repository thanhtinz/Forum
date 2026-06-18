import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Hằng số (viết lại từ mod nông trại WAP, toàn bộ Xu & Lượng -> coin)
const PLOT_PRICE_STEP = 5000;
const MAX_PLOTS = 55;
const DOG_PRICE = 20000;
const DOG_DAYS = 30;
const CHECKIN_REWARD = 500;
const STEAL_EXP_COST = 200;
const STEAL_SUCCESS = 0.6;
const MAX_KITCHEN_LEVEL = 15;
const MAX_FEED = 3;
// Sức khỏe ô đất (mô phỏng cơ chế sucKhoe của Avatar): sản lượng = raw × health/100
const PLANT_BASE_HEALTH = 60; // mới gieo cần chăm sóc mới đạt full
const WATER_HEALTH = 25;      // tưới nước +25
const FERTILIZE_HEALTH = 15;  // bón phân +15

@Injectable()
export class FarmService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // STATE tổng quan
  // ──────────────────────────────────────────────
  async getState(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    await this.cleanupDeadAnimals(char.id);

    const [plots, warehouse, animals] = await Promise.all([
      this.prisma.farmPlot.findMany({
        where: { characterId: char.id },
        orderBy: { index: 'asc' },
        include: { crop: { select: { slug: true, name: true, asset: true, sellPrice: true } } },
      }),
      this.prisma.warehouseItem.findMany({
        where: { characterId: char.id, quantity: { gt: 0 } },
        orderBy: { category: 'asc' },
      }),
      this.prisma.farmAnimal.findMany({
        where: { characterId: char.id },
        include: { animal: true },
      }),
    ]);
    const fertilizers = await this.prisma.farmFertilizer.findMany({
      where: { characterId: char.id, quantity: { gt: 0 } },
      include: { fertilizer: { select: { slug: true, name: true, reduceSeconds: true } } },
    });

    const now = Date.now();
    return {
      coin: char.coinBalance,
      profile: {
        level: profile.level,
        exp: profile.exp,
        plotCount: profile.plotCount,
        nextPlotPrice: profile.nextPlotPrice,
        kitchenLevel: profile.kitchenLevel,
        dogActive: profile.dogUntil ? profile.dogUntil.getTime() > now : false,
        dogUntil: profile.dogUntil,
      },
      plots: plots.map((p) => {
        const total = p.plantedAt && p.readyAt ? p.readyAt.getTime() - p.plantedAt.getTime() : 0;
        const done = p.plantedAt ? now - p.plantedAt.getTime() : 0;
        const progress = total > 0 ? Math.max(0, Math.min(1, done / total)) : 0;
        return {
          index: p.index,
          slug: p.crop?.slug ?? null,
          crop: p.crop?.name ?? null,
          asset: p.crop?.asset ?? null,
          watered: p.watered,
          health: p.health,
          ready: p.readyAt ? p.readyAt.getTime() <= now : false,
          readyAt: p.readyAt,
          progress,
          empty: !p.cropId,
        };
      }),
      warehouse: warehouse.map((w) => ({
        slug: w.slug,
        name: w.name,
        category: w.category,
        quantity: w.quantity,
        unitSell: w.unitSell,
        asset: w.asset,
      })),
      animals: animals.map((a) => ({
        id: a.id,
        slug: a.animal.slug,
        name: a.animal.name,
        grown: a.grownAt.getTime() <= now,
        grownAt: a.grownAt,
        productReady: a.productReadyAt ? a.productReadyAt.getTime() <= now : false,
        productReadyAt: a.productReadyAt,
        hasProduct: !!a.animal.productSlug,
        fedCount: a.fedCount,
        diesAt: a.diesAt,
        asset: a.animal.asset,
      })),
      fertilizers: fertilizers.map((f) => ({
        slug: f.fertilizer.slug,
        name: f.fertilizer.name,
        quantity: f.quantity,
        reduceSeconds: f.fertilizer.reduceSeconds,
      })),
      khe: this.kheInfo(profile),
    };
  }

  // ──────────────────────────────────────────────
  // CÂY KHẾ (cây sẵn — ra quả theo thời gian, tưới để tăng, thu hoạch bán)
  // Theo game gốc: tối đa 180 quả; "ăn khế trả vàng".
  // ──────────────────────────────────────────────
  private readonly KHE_MAX = 180;
  private readonly KHE_REGEN_MS = 8 * 60 * 1000; // 1 quả / 8 phút (~180 quả/ngày)
  private readonly KHE_WATER_BONUS = 30;         // tưới mỗi ngày +30 quả
  private readonly KHE_PRICE = 50;               // coin / quả khi thu hoạch

  // Số quả khế hiện tại = đã chốt + sinh thêm theo thời gian (cap KHE_MAX)
  private currentKheFruit(profile: { kheFruit: number; kheUpdatedAt: Date | null }) {
    const base = profile.kheFruit || 0;
    const since = profile.kheUpdatedAt ? Date.now() - profile.kheUpdatedAt.getTime() : 0;
    const grown = since > 0 ? Math.floor(since / this.KHE_REGEN_MS) : 0;
    return Math.min(this.KHE_MAX, base + grown);
  }

  private kheInfo(profile: { kheFruit: number; kheUpdatedAt: Date | null; kheLastWaterAt: Date | null }) {
    const DAY = 24 * 3600 * 1000;
    const last = profile.kheLastWaterAt ? profile.kheLastWaterAt.getTime() : 0;
    const nextWaterAt = last ? new Date(last + DAY) : null;
    const fruit = this.currentKheFruit(profile);
    const now = Date.now();
    const base = profile.kheFruit || 0;
    const lastUpd = profile.kheUpdatedAt ? profile.kheUpdatedAt.getTime() : now;
    let nextFruitAt: Date | null = null;
    let fullAt: Date | null = null;
    if (fruit < this.KHE_MAX) {
      const sinceLast = (now - lastUpd) % this.KHE_REGEN_MS;
      nextFruitAt = new Date(now + (this.KHE_REGEN_MS - sinceLast));
      fullAt = new Date(lastUpd + (this.KHE_MAX - base) * this.KHE_REGEN_MS);
    }
    return {
      fruit,
      max: this.KHE_MAX,
      pricePerFruit: this.KHE_PRICE,
      canWater: !nextWaterAt || nextWaterAt.getTime() <= now,
      nextWaterAt,
      nextFruitAt,
      fullAt,
    };
  }

  // Tưới: cộng quả thưởng (1 lần/ngày)
  async waterKhe(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const info = this.kheInfo(profile as any);
    if (!info.canWater) throw new BadRequestException('Cây khế đã được tưới hôm nay, quay lại sau.');
    const fruit = Math.min(this.KHE_MAX, this.currentKheFruit(profile as any) + this.KHE_WATER_BONUS);
    await this.prisma.farmProfile.update({
      where: { characterId: char.id },
      data: { kheFruit: fruit, kheUpdatedAt: new Date(), kheLastWaterAt: new Date() },
    });
    return { fruit, bonus: this.KHE_WATER_BONUS };
  }

  // Thu hoạch: thả quả khế vào kho (bán sau như nông sản khác)
  async harvestKhe(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const fruit = this.currentKheFruit(profile as any);
    if (fruit <= 0) throw new BadRequestException('Cây khế chưa có quả để thu hoạch.');
    await this.prisma.$transaction(async (tx) => {
      await tx.farmProfile.update({ where: { characterId: char.id }, data: { kheFruit: 0, kheUpdatedAt: new Date() } });
      await this.addWarehouse(tx, char.id, {
        slug: 'qua-khe', name: 'Quả Khế', category: 'CROP', unitSell: this.KHE_PRICE,
        asset: '/game-assets/nongtrai/img/caykhechin.png',
      }, fruit);
    });
    return { harvested: fruit };
  }

  // ──────────────────────────────────────────────
  // ĐẤT
  // ──────────────────────────────────────────────
  async buyPlot(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    if (profile.plotCount >= MAX_PLOTS) {
      throw new BadRequestException(`Tối đa ${MAX_PLOTS} ô đất`);
    }
    const price = profile.nextPlotPrice;
    await this.prisma.$transaction(async (tx) => {
      await this.spendCoin(tx, char.id, price, 'farm_plot', 'Mua ô đất');
      await tx.farmPlot.create({ data: { characterId: char.id, index: profile.plotCount } });
      await tx.farmProfile.update({
        where: { characterId: char.id },
        data: {
          plotCount: { increment: 1 },
          nextPlotPrice: { increment: PLOT_PRICE_STEP },
        },
      });
    });
    return { ok: true, plotIndex: profile.plotCount, spent: price, nextPrice: price + PLOT_PRICE_STEP };
  }

  // ──────────────────────────────────────────────
  // CỬA HÀNG HẠT GIỐNG + MUA
  // ──────────────────────────────────────────────
  async listCrops() {
    return this.prisma.cropTemplate.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async buySeed(userId: string, cropSlug: string, qty: number) {
    qty = this.assertQty(qty);
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const crop = await this.prisma.cropTemplate.findUnique({ where: { slug: cropSlug } });
    if (!crop) throw new NotFoundException('Cây trồng không tồn tại');
    if (profile.level < crop.reqLevel) {
      throw new BadRequestException(`Cần đạt cấp nông trại ${crop.reqLevel}`);
    }
    const cost = crop.seedPrice * qty;
    await this.prisma.$transaction(async (tx) => {
      await this.spendCoin(tx, char.id, cost, 'farm_seed', `Mua hạt ${crop.name}`);
      await this.addWarehouse(tx, char.id, {
        slug: `seed_${crop.slug}`,
        name: `Hạt ${crop.name}`,
        category: 'SEED',
        unitSell: 0,
        asset: crop.asset,
      }, qty);
    });
    return { ok: true, qty, spent: cost };
  }

  // ──────────────────────────────────────────────
  // GIEO / TƯỚI / BÓN / THU HOẠCH
  // ──────────────────────────────────────────────
  async plant(userId: string, plotIndex: number, cropSlug: string) {
    const char = await this.getCharacter(userId);
    const plot = await this.getPlot(char.id, plotIndex);
    if (plot.cropId) throw new BadRequestException('Ô đất đang có cây');
    const crop = await this.prisma.cropTemplate.findUnique({ where: { slug: cropSlug } });
    if (!crop) throw new NotFoundException('Cây trồng không tồn tại');

    const seedSlug = `seed_${crop.slug}`;
    await this.prisma.$transaction(async (tx) => {
      const seed = await tx.warehouseItem.findUnique({
        where: { characterId_slug_category: { characterId: char.id, slug: seedSlug, category: 'SEED' } },
      });
      if (!seed || seed.quantity < 1) throw new BadRequestException('Bạn chưa có hạt giống này');
      await tx.warehouseItem.update({ where: { id: seed.id }, data: { quantity: { decrement: 1 } } });
      const readyAt = new Date(Date.now() + crop.growSeconds * 1000);
      await tx.farmPlot.update({
        where: { id: plot.id },
        data: { cropId: crop.id, plantedAt: new Date(), readyAt, watered: false, health: PLANT_BASE_HEALTH, yield: 0 },
      });
    });
    return { ok: true, plotIndex, crop: crop.name };
  }

  async water(userId: string, plotIndex: number) {
    const char = await this.getCharacter(userId);
    const plot = await this.getPlot(char.id, plotIndex);
    if (!plot.cropId) throw new BadRequestException('Ô đất trống');
    if (plot.watered) return { ok: true, alreadyWatered: true, health: plot.health };
    const health = Math.min(100, plot.health + WATER_HEALTH);
    await this.prisma.farmPlot.update({ where: { id: plot.id }, data: { watered: true, health } });
    return { ok: true, health };
  }

  async applyFertilizer(userId: string, plotIndex: number, fertilizerSlug: string) {
    const char = await this.getCharacter(userId);
    const plot = await this.getPlot(char.id, plotIndex);
    if (!plot.cropId || !plot.readyAt) throw new BadRequestException('Ô đất trống');
    const fert = await this.prisma.fertilizerTemplate.findUnique({ where: { slug: fertilizerSlug } });
    if (!fert) throw new NotFoundException('Phân bón không tồn tại');

    await this.prisma.$transaction(async (tx) => {
      const owned = await tx.farmFertilizer.findUnique({
        where: { characterId_fertilizerId: { characterId: char.id, fertilizerId: fert.id } },
      });
      if (!owned || owned.quantity < 1) throw new BadRequestException('Bạn chưa có phân bón này');
      await tx.farmFertilizer.update({
        where: { characterId_fertilizerId: { characterId: char.id, fertilizerId: fert.id } },
        data: { quantity: { decrement: 1 } },
      });
      const newReady = new Date(plot.readyAt!.getTime() - fert.reduceSeconds * 1000);
      const health = Math.min(100, plot.health + FERTILIZE_HEALTH);
      await tx.farmPlot.update({ where: { id: plot.id }, data: { readyAt: newReady, health } });
    });
    return { ok: true, reducedSeconds: fert.reduceSeconds };
  }

  async harvest(userId: string, plotIndex: number) {
    const char = await this.getCharacter(userId);
    const plot = await this.getPlot(char.id, plotIndex, true);
    if (!plot.cropId || !plot.crop || !plot.readyAt) throw new BadRequestException('Ô đất trống');
    if (plot.readyAt.getTime() > Date.now()) throw new BadRequestException('Cây chưa chín');

    const crop = plot.crop;
    const raw = crop.yieldMin + Math.floor(Math.random() * (crop.yieldMax - crop.yieldMin + 1));
    // Sản lượng theo sức khỏe ô đất (công thức Avatar): raw × health/100
    const amount = Math.max(1, Math.round((raw * plot.health) / 100));

    const result = await this.prisma.$transaction(async (tx) => {
      await this.addWarehouse(tx, char.id, {
        slug: crop.slug,
        name: crop.name,
        category: 'CROP',
        unitSell: crop.sellPrice,
        asset: crop.asset,
      }, amount);
      await tx.farmPlot.update({
        where: { id: plot.id },
        data: { cropId: null, plantedAt: null, readyAt: null, watered: false, health: 100, yield: 0 },
      });
      return this.addExp(tx, char.id, crop.exp);
    });
    return { ok: true, crop: crop.name, amount, expGained: crop.exp, ...result };
  }

  // ──────────────────────────────────────────────
  // PHÂN BÓN: cửa hàng + mua
  // ──────────────────────────────────────────────
  async listFertilizers() {
    return this.prisma.fertilizerTemplate.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async buyFertilizer(userId: string, slug: string, qty: number) {
    qty = this.assertQty(qty);
    const char = await this.getCharacter(userId);
    await this.getProfile(char.id);
    const fert = await this.prisma.fertilizerTemplate.findUnique({ where: { slug } });
    if (!fert) throw new NotFoundException('Phân bón không tồn tại');
    const cost = fert.price * qty;
    await this.prisma.$transaction(async (tx) => {
      await this.spendCoin(tx, char.id, cost, 'farm_fertilizer', `Mua ${fert.name}`);
      await tx.farmFertilizer.upsert({
        where: { characterId_fertilizerId: { characterId: char.id, fertilizerId: fert.id } },
        update: { quantity: { increment: qty } },
        create: { characterId: char.id, fertilizerId: fert.id, quantity: qty },
      });
    });
    return { ok: true, qty, spent: cost };
  }

  // ──────────────────────────────────────────────
  // KHO + BÁN
  // ──────────────────────────────────────────────
  async sell(userId: string, slug: string, category: string, qty: number) {
    qty = this.assertQty(qty);
    const char = await this.getCharacter(userId);
    const item = await this.prisma.warehouseItem.findUnique({
      where: { characterId_slug_category: { characterId: char.id, slug, category } },
    });
    if (!item || item.quantity < qty) throw new BadRequestException('Không đủ số lượng trong kho');
    if (item.unitSell <= 0) throw new BadRequestException('Vật phẩm này không bán được');
    const value = item.unitSell * qty;
    await this.prisma.$transaction(async (tx) => {
      await tx.warehouseItem.update({ where: { id: item.id }, data: { quantity: { decrement: qty } } });
      await this.addCoin(tx, char.id, value, 'farm_sell', `Bán ${item.name}`);
    });
    return { ok: true, value };
  }

  // ──────────────────────────────────────────────
  // VẬT NUÔI
  // ──────────────────────────────────────────────
  async listAnimals() {
    return this.prisma.animalTemplate.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async buyAnimal(userId: string, slug: string) {
    const char = await this.getCharacter(userId);
    await this.getProfile(char.id);
    const tpl = await this.prisma.animalTemplate.findUnique({ where: { slug } });
    if (!tpl) throw new NotFoundException('Vật nuôi không tồn tại');
    const now = Date.now();
    await this.prisma.$transaction(async (tx) => {
      await this.spendCoin(tx, char.id, tpl.buyPrice, 'farm_animal', `Mua ${tpl.name}`);
      await tx.farmAnimal.create({
        data: {
          characterId: char.id,
          animalId: tpl.id,
          grownAt: new Date(now + tpl.growSeconds * 1000),
          diesAt: new Date(now + tpl.lifeSeconds * 1000),
          lastFedAt: new Date(),
        },
      });
    });
    return { ok: true, animal: tpl.name, spent: tpl.buyPrice };
  }

  async feedAnimal(userId: string, animalId: string) {
    const char = await this.getCharacter(userId);
    const a = await this.getAnimal(char.id, animalId);
    const now = Date.now();
    if (a.lastFedAt.getTime() + a.animal.feedCooldownSec * 1000 > now) {
      throw new BadRequestException('Chưa tới giờ cho ăn lại');
    }
    if (a.fedCount >= MAX_FEED) throw new BadRequestException('Đã cho ăn tối đa, hãy thu hoạch sản phẩm');
    const productReadyAt =
      a.productReadyAt ?? new Date(Math.max(now, a.grownAt.getTime()));
    await this.prisma.farmAnimal.update({
      where: { id: a.id },
      data: { fedCount: { increment: 1 }, lastFedAt: new Date(), productReadyAt },
    });
    return { ok: true, fedCount: a.fedCount + 1 };
  }

  async collectAnimal(userId: string, animalId: string) {
    const char = await this.getCharacter(userId);
    const a = await this.getAnimal(char.id, animalId);
    const now = Date.now();
    if (a.grownAt.getTime() > now) throw new BadRequestException('Vật nuôi chưa trưởng thành');
    if (!a.animal.productSlug || a.animal.productYield <= 0) {
      throw new BadRequestException('Vật nuôi này không cho sản phẩm');
    }
    if (a.fedCount <= 0) throw new BadRequestException('Cần cho ăn trước khi thu hoạch');
    if (a.productReadyAt && a.productReadyAt.getTime() > now) {
      throw new BadRequestException('Sản phẩm chưa sẵn sàng');
    }
    const amount = a.animal.productYield * Math.min(a.fedCount, MAX_FEED);
    await this.prisma.$transaction(async (tx) => {
      await this.addWarehouse(tx, char.id, {
        slug: a.animal.productSlug!,
        name: a.animal.productName ?? a.animal.productSlug!,
        category: 'PRODUCT',
        unitSell: a.animal.productPrice,
        asset: a.animal.asset,
      }, amount);
      await tx.farmAnimal.update({
        where: { id: a.id },
        data: { fedCount: 0, productReadyAt: null },
      });
    });
    return { ok: true, product: a.animal.productName, amount };
  }

  async sellAnimal(userId: string, animalId: string) {
    const char = await this.getCharacter(userId);
    const a = await this.getAnimal(char.id, animalId);
    const grown = a.grownAt.getTime() <= Date.now();
    const value = grown ? a.animal.sellGrown : a.animal.sellYoung;
    await this.prisma.$transaction(async (tx) => {
      await tx.farmAnimal.delete({ where: { id: a.id } });
      if (value > 0) await this.addCoin(tx, char.id, value, 'farm_animal_sell', `Bán ${a.animal.name}`);
    });
    return { ok: true, value };
  }

  // ──────────────────────────────────────────────
  // NHÀ BẾP
  // ──────────────────────────────────────────────
  async listRecipes(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const [recipes, skills, cooking] = await Promise.all([
      this.prisma.recipeTemplate.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { ingredients: true },
      }),
      this.prisma.farmSkill.findMany({ where: { characterId: char.id }, select: { recipeId: true } }),
      this.prisma.farmCooking.findMany({
        where: { characterId: char.id },
        include: { recipe: { select: { name: true, asset: true, reward: true } } },
        orderBy: { doneAt: 'asc' },
      }),
    ]);
    const learned = new Set(skills.map((s) => s.recipeId));
    return {
      kitchenLevel: profile.kitchenLevel,
      maxKitchen: MAX_KITCHEN_LEVEL,
      exp: profile.exp,
      upgradeCost: profile.kitchenLevel >= MAX_KITCHEN_LEVEL ? null : (profile.kitchenLevel <= 5 ? 1000 * profile.kitchenLevel : 3000 * profile.kitchenLevel),
      cooking: cooking.map((c) => ({ id: c.id, name: c.recipe.name, asset: c.recipe.asset, reward: c.recipe.reward, doneAt: c.doneAt })),
      recipes: recipes.map((r) => ({
        slug: r.slug,
        name: r.name,
        cookSeconds: r.cookSeconds,
        reward: r.reward,
        needSkill: r.needSkill,
        learned: !r.needSkill || learned.has(r.id),
        skillExp: r.skillExp,
        ingredients: r.ingredients.map((i) => ({ slug: i.cropSlug, name: i.name, quantity: i.quantity })),
        asset: r.asset,
      })),
    };
  }

  async learnSkill(userId: string, recipeSlug: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const recipe = await this.prisma.recipeTemplate.findUnique({ where: { slug: recipeSlug } });
    if (!recipe) throw new NotFoundException('Công thức không tồn tại');
    if (!recipe.needSkill) return { ok: true, message: 'Công thức này không cần học' };
    const existing = await this.prisma.farmSkill.findUnique({
      where: { characterId_recipeId: { characterId: char.id, recipeId: recipe.id } },
    });
    if (existing) return { ok: true, message: 'Đã học rồi' };
    if (profile.exp < recipe.skillExp) {
      throw new BadRequestException(`Cần ${recipe.skillExp} EXP nông trại để học`);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.farmProfile.update({
        where: { characterId: char.id },
        data: { exp: { decrement: recipe.skillExp }, level: this.farmLevel(profile.exp - recipe.skillExp) },
      });
      await tx.farmSkill.create({ data: { characterId: char.id, recipeId: recipe.id } });
    });
    return { ok: true, learned: recipe.name };
  }

  async cook(userId: string, recipeSlug: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const recipe = await this.prisma.recipeTemplate.findUnique({
      where: { slug: recipeSlug },
      include: { ingredients: true },
    });
    if (!recipe) throw new NotFoundException('Công thức không tồn tại');

    if (recipe.needSkill) {
      const skill = await this.prisma.farmSkill.findUnique({
        where: { characterId_recipeId: { characterId: char.id, recipeId: recipe.id } },
      });
      if (!skill) throw new BadRequestException('Bạn chưa học công thức này');
    }
    const cooking = await this.prisma.farmCooking.count({ where: { characterId: char.id } });
    if (cooking >= profile.kitchenLevel) {
      throw new BadRequestException(`Bếp chỉ nấu tối đa ${profile.kitchenLevel} món cùng lúc`);
    }

    await this.prisma.$transaction(async (tx) => {
      // kiểm tra + trừ nguyên liệu (tìm trong CROP rồi PRODUCT)
      for (const ing of recipe.ingredients) {
        const item = await tx.warehouseItem.findFirst({
          where: { characterId: char.id, slug: ing.cropSlug, category: { in: ['CROP', 'PRODUCT'] } },
        });
        if (!item || item.quantity < ing.quantity) {
          throw new BadRequestException(`Thiếu nguyên liệu: ${ing.name}`);
        }
        await tx.warehouseItem.update({
          where: { id: item.id },
          data: { quantity: { decrement: ing.quantity } },
        });
      }
      await tx.farmCooking.create({
        data: {
          characterId: char.id,
          recipeId: recipe.id,
          doneAt: new Date(Date.now() + recipe.cookSeconds * 1000),
        },
      });
    });
    return { ok: true, dish: recipe.name, doneInSec: recipe.cookSeconds };
  }

  async collectDishes(userId: string) {
    const char = await this.getCharacter(userId);
    const done = await this.prisma.farmCooking.findMany({
      where: { characterId: char.id, doneAt: { lte: new Date() } },
      include: { recipe: { select: { name: true, reward: true } } },
    });
    if (done.length === 0) return { ok: true, collected: 0, reward: 0 };
    const reward = done.reduce((s, c) => s + c.recipe.reward, 0);
    await this.prisma.$transaction(async (tx) => {
      await tx.farmCooking.deleteMany({
        where: { id: { in: done.map((d) => d.id) } },
      });
      await this.addCoin(tx, char.id, reward, 'farm_dish', 'Bán bánh');
    });
    return { ok: true, collected: done.length, reward };
  }

  async upgradeKitchen(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    if (profile.kitchenLevel >= MAX_KITCHEN_LEVEL) {
      throw new BadRequestException('Bếp đã đạt cấp tối đa');
    }
    const lvl = profile.kitchenLevel;
    const costExp = lvl <= 5 ? 1000 * lvl : 3000 * lvl;
    if (profile.exp < costExp) throw new BadRequestException(`Cần ${costExp} EXP nông trại`);
    await this.prisma.farmProfile.update({
      where: { characterId: char.id },
      data: {
        exp: { decrement: costExp },
        kitchenLevel: { increment: 1 },
        level: this.farmLevel(profile.exp - costExp),
      },
    });
    return { ok: true, kitchenLevel: lvl + 1, spentExp: costExp };
  }

  // ──────────────────────────────────────────────
  // CHÓ + ĐIỂM DANH + ĂN TRỘM
  // ──────────────────────────────────────────────
  async buyDog(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const base = profile.dogUntil && profile.dogUntil.getTime() > Date.now()
      ? profile.dogUntil.getTime()
      : Date.now();
    const until = new Date(base + DOG_DAYS * 86400 * 1000);
    await this.prisma.$transaction(async (tx) => {
      await this.spendCoin(tx, char.id, DOG_PRICE, 'farm_dog', 'Mua chó giữ nhà');
      await tx.farmProfile.update({ where: { characterId: char.id }, data: { dogUntil: until } });
    });
    return { ok: true, dogUntil: until, spent: DOG_PRICE };
  }

  async dailyCheckin(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastCheckinAt && profile.lastCheckinAt.toISOString().slice(0, 10) === today) {
      throw new BadRequestException('Hôm nay bạn đã điểm danh rồi');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.farmProfile.update({ where: { characterId: char.id }, data: { lastCheckinAt: new Date() } });
      await this.addCoin(tx, char.id, CHECKIN_REWARD, 'farm_checkin', 'Điểm danh nông trại');
    });
    return { ok: true, reward: CHECKIN_REWARD };
  }

  // Ăn trộm cây chín của hàng xóm
  // Xem nông trại người khác để đi cướp: ô đất đang chín + trạng thái chó
  async viewFarm(targetUsername: string) {
    const target = await this.prisma.user.findUnique({
      where: { username: targetUsername },
      select: { username: true, displayName: true, gameCharacter: { select: { id: true } } },
    });
    const charId = target?.gameCharacter?.id;
    if (!charId) throw new NotFoundException('Không tìm thấy nông trại của người này');
    const profile = await this.prisma.farmProfile.findUnique({ where: { characterId: charId }, select: { dogUntil: true } });
    const now = Date.now();
    const plots = await this.prisma.farmPlot.findMany({
      where: { characterId: charId },
      orderBy: { index: 'asc' },
      include: { crop: { select: { name: true, slug: true } } },
    });
    return {
      username: target!.username,
      displayName: target!.displayName,
      dogActive: profile?.dogUntil ? profile.dogUntil.getTime() > now : false,
      plots: plots.map((p) => ({
        index: p.index,
        crop: p.crop?.name ?? null,
        slug: p.crop?.slug ?? null,
        ready: !!(p.cropId && p.readyAt && p.readyAt.getTime() <= now),
        empty: !p.cropId,
      })),
    };
  }

  async steal(userId: string, targetUsername: string, plotIndex: number) {
    const thief = await this.getCharacter(userId);
    const profile = await this.getProfile(thief.id);
    if (profile.exp < STEAL_EXP_COST) {
      throw new BadRequestException(`Cần ${STEAL_EXP_COST} EXP nông trại để đi trộm`);
    }
    const targetUser = await this.prisma.user.findUnique({
      where: { username: targetUsername },
      select: { gameCharacter: { select: { id: true } } },
    });
    const victimCharId = targetUser?.gameCharacter?.id;
    if (!victimCharId) throw new NotFoundException('Không tìm thấy nông trại này');
    if (victimCharId === thief.id) throw new BadRequestException('Không thể trộm chính mình');

    const plot = await this.prisma.farmPlot.findUnique({
      where: { characterId_index: { characterId: victimCharId, index: plotIndex } },
      include: { crop: true },
    });
    if (!plot || !plot.cropId || !plot.crop || !plot.readyAt || plot.readyAt.getTime() > Date.now()) {
      throw new BadRequestException('Ô đất này không có cây chín để trộm');
    }

    // Trừ EXP đi trộm
    const victimProfile = await this.prisma.farmProfile.findUnique({ where: { characterId: victimCharId } });
    const dogActive = victimProfile?.dogUntil ? victimProfile.dogUntil.getTime() > Date.now() : false;

    // Có chó -> bị cắn, mất tới 50% coin
    if (dogActive) {
      const penalty = Math.floor(Math.random() * (Math.floor(thief.coinBalance / 2) + 1));
      await this.prisma.$transaction(async (tx) => {
        await tx.farmProfile.update({
          where: { characterId: thief.id },
          data: { exp: { decrement: STEAL_EXP_COST }, level: this.farmLevel(Math.max(0, profile.exp - STEAL_EXP_COST)) },
        });
        if (penalty > 0) await this.spendCoin(tx, thief.id, penalty, 'farm_dog_bite', 'Bị chó cắn khi trộm');
      });
      return { ok: true, success: false, message: `Bị chó cắn! Mất ${penalty} coin`, penalty };
    }

    const crop = plot.crop;
    const stolen =
      Math.random() < STEAL_SUCCESS
        ? Math.max(1, Math.floor((crop.yieldMin + Math.random() * (crop.yieldMax - crop.yieldMin)) / 10))
        : 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.farmProfile.update({
        where: { characterId: thief.id },
        data: { exp: { decrement: STEAL_EXP_COST }, level: this.farmLevel(Math.max(0, profile.exp - STEAL_EXP_COST)) },
      });
      if (stolen > 0) {
        await this.addWarehouse(tx, thief.id, {
          slug: crop.slug,
          name: crop.name,
          category: 'CROP',
          unitSell: crop.sellPrice,
          asset: crop.asset,
        }, stolen);
      }
    });
    return stolen > 0
      ? { ok: true, success: true, crop: crop.name, amount: stolen }
      : { ok: true, success: false, message: 'Trộm hụt, không lấy được gì' };
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  private assertQty(qty: number) {
    const q = Math.floor(Number(qty));
    if (!Number.isInteger(q) || q < 1 || q > 999) throw new BadRequestException('Số lượng không hợp lệ (1-999)');
    return q;
  }

  private farmLevel(exp: number) {
    return Math.min(50, Math.floor(exp / 500));
  }

  private async getCharacter(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Bạn chưa tạo nhân vật game');
    return char;
  }

  private async getProfile(characterId: string) {
    const existing = await this.prisma.farmProfile.findUnique({ where: { characterId } });
    if (existing) return existing;
    return this.prisma.farmProfile.create({ data: { characterId } });
  }

  private async getPlot(characterId: string, index: number, withCrop = false) {
    const plot = await this.prisma.farmPlot.findUnique({
      where: { characterId_index: { characterId, index } },
      include: withCrop ? { crop: true } : undefined,
    });
    if (!plot) throw new NotFoundException('Ô đất không tồn tại');
    return plot as typeof plot & { crop?: Prisma.CropTemplateGetPayload<object> | null };
  }

  private async getAnimal(characterId: string, animalId: string) {
    const a = await this.prisma.farmAnimal.findFirst({
      where: { id: animalId, characterId },
      include: { animal: true },
    });
    if (!a) throw new NotFoundException('Vật nuôi không tồn tại');
    return a;
  }

  // Cập nhật EXP + level (trong transaction)
  private async addExp(tx: Prisma.TransactionClient, characterId: string, exp: number) {
    const p = await tx.farmProfile.findUnique({ where: { characterId }, select: { exp: true, level: true } });
    if (!p) throw new NotFoundException();
    const newExp = p.exp + exp;
    const newLevel = this.farmLevel(newExp);
    await tx.farmProfile.update({ where: { characterId }, data: { exp: newExp, level: newLevel } });
    return { level: newLevel, leveledUp: newLevel > p.level };
  }

  // Xóa vật nuôi chết (hết đời hoặc bỏ đói quá lâu)
  private async cleanupDeadAnimals(characterId: string) {
    const now = new Date();
    const animals = await this.prisma.farmAnimal.findMany({
      where: { characterId },
      include: { animal: { select: { starveSeconds: true } } },
    });
    const deadIds = animals
      .filter(
        (a) =>
          a.diesAt <= now ||
          a.lastFedAt.getTime() + a.animal.starveSeconds * 1000 <= now.getTime(),
      )
      .map((a) => a.id);
    if (deadIds.length > 0) {
      await this.prisma.farmAnimal.deleteMany({ where: { id: { in: deadIds } } });
    }
  }

  private async addWarehouse(
    tx: Prisma.TransactionClient,
    characterId: string,
    item: { slug: string; name: string; category: string; unitSell: number; asset?: string | null },
    qty: number,
  ) {
    await tx.warehouseItem.upsert({
      where: { characterId_slug_category: { characterId, slug: item.slug, category: item.category } },
      update: { quantity: { increment: qty }, unitSell: item.unitSell, asset: item.asset ?? undefined },
      create: {
        characterId,
        slug: item.slug,
        name: item.name,
        category: item.category,
        unitSell: item.unitSell,
        asset: item.asset ?? null,
        quantity: qty,
      },
    });
  }

  private async spendCoin(tx: Prisma.TransactionClient, characterId: string, amount: number, refId: string, note: string) {
    const char = await tx.gameCharacter.findUnique({ where: { id: characterId }, select: { coinBalance: true } });
    if (!char) throw new NotFoundException();
    if (char.coinBalance < amount) throw new BadRequestException('Không đủ coin');
    const balanceAfter = char.coinBalance - amount;
    await tx.gameCharacter.update({ where: { id: characterId }, data: { coinBalance: balanceAfter } });
    await tx.coinTransaction.create({
      data: { characterId, type: 'spend_farm', amount: -amount, balanceBefore: char.coinBalance, balanceAfter, refId, note },
    });
  }

  private async addCoin(tx: Prisma.TransactionClient, characterId: string, amount: number, refId: string, note: string) {
    const char = await tx.gameCharacter.findUnique({ where: { id: characterId }, select: { coinBalance: true } });
    if (!char) throw new NotFoundException();
    const balanceAfter = char.coinBalance + amount;
    await tx.gameCharacter.update({ where: { id: characterId }, data: { coinBalance: balanceAfter } });
    await tx.coinTransaction.create({
      data: { characterId, type: 'earn_farm', amount, balanceBefore: char.coinBalance, balanceAfter, refId, note },
    });
  }
}
