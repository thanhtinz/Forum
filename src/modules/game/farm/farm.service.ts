import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Hằng số (viết lại từ mod nông trại WAP, toàn bộ Xu & Lượng -> coin)
const MAX_PLOTS = 50;        // tối đa 50 ô đất
const START_PLOTS = 5;       // ban đầu 5 ô
const EXP_PER_LEVEL = 500;   // mỗi cấp cần 500 EXP; mỗi cấp mở thêm 1 ô (tới khi đạt 50)
const MAX_FARM_LEVEL = 50;
const DOG_PRICE = 20000;
const DOG_DAYS = 30;
const CHECKIN_REWARD = 500;
const STEAL_EXP_COST = 200;
const STEAL_SUCCESS = 0.6;
const MAX_FEED = 3;
// Thức ăn & thuốc cho vật nuôi (gia cầm / gia súc / thuốc thú y)
const FEED_OF: Record<string, string> = { ga: 'feed-poultry', vit: 'feed-poultry', bo: 'feed-livestock', lon: 'feed-livestock' };
const SUPPLIES = [
  { slug: 'feed-poultry', name: 'Thức ăn gia cầm', price: 120, kind: 'feed' },
  { slug: 'feed-livestock', name: 'Thức ăn gia súc', price: 200, kind: 'feed' },
  { slug: 'medicine', name: 'Thuốc thú y', price: 500, kind: 'medicine' },
];
const SICK_CHANCE = 0.12; // tỉ lệ vật nuôi bị bệnh sau mỗi lần cho ăn
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
    // Mở ô đất theo cấp: đảm bảo đã có đủ ô được mở khoá (5 + level, tối đa 50)
    await this.ensurePlots(char.id, profile.level);

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
    // Lấy icon nông sản từ dữ liệu admin để kho luôn khớp cửa hàng (kể cả quả khế)
    const cropTemplates = await this.prisma.cropTemplate.findMany({ select: { slug: true, name: true, asset: true } });
    const cropAsset = new Map(cropTemplates.map((c) => [c.slug, c.asset]));
    const kheAsset = cropTemplates.find((c) => ['qua-khe', 'khe'].includes(c.slug) || /khế/i.test(c.name))?.asset ?? '/game-assets/nongtrai/pixel/qua-khe.png';

    const now = Date.now();
    return {
      coin: char.coinBalance,
      profile: {
        level: profile.level,
        exp: profile.exp,
        maxLevel: MAX_FARM_LEVEL,
        // Dữ liệu thanh EXP: tiến độ trong cấp hiện tại
        expIntoLevel: profile.level >= MAX_FARM_LEVEL ? 0 : profile.exp - profile.level * EXP_PER_LEVEL,
        expForNextLevel: profile.level >= MAX_FARM_LEVEL ? null : EXP_PER_LEVEL,
        plotCount: plots.length,
        maxPlots: MAX_PLOTS,
        // Cấp cần đạt để mở thêm 1 ô (null nếu đã đủ 50 ô)
        nextPlotLevel: plots.length >= MAX_PLOTS ? null : Math.max(profile.level + 1, plots.length - START_PLOTS + 1),
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
          tilled: p.tilled,
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
        // Nông sản: ưu tiên icon theo crop template admin (đồng bộ cửa hàng); quả khế lấy theo template khế
        asset: w.category === 'CROP'
          ? (cropAsset.get(w.slug) ?? (w.slug === 'qua-khe' ? kheAsset : null) ?? w.asset)
          : w.asset,
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
        sick: !!a.sickAt,
        asset: a.animal.asset,
      })),
      supplies: {
        'feed-poultry': warehouse.find((w) => w.slug === 'feed-poultry' && w.category === 'SUPPLY')?.quantity ?? 0,
        'feed-livestock': warehouse.find((w) => w.slug === 'feed-livestock' && w.category === 'SUPPLY')?.quantity ?? 0,
        'medicine': warehouse.find((w) => w.slug === 'medicine' && w.category === 'SUPPLY')?.quantity ?? 0,
      },
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
    // Lấy icon/giá quả khế từ dữ liệu game (admin) nếu có — kho hiển thị icon quả, không phải cả cây.
    const tpl = await this.prisma.cropTemplate.findFirst({
      where: { OR: [{ slug: 'qua-khe' }, { slug: 'khe' }, { name: { contains: 'Khế' } }, { name: { contains: 'khế' } }] },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.farmProfile.update({ where: { characterId: char.id }, data: { kheFruit: 0, kheUpdatedAt: new Date() } });
      await this.addWarehouse(tx, char.id, {
        // giữ slug 'qua-khe' để cập nhật luôn icon của các stack đã có trong kho
        slug: 'qua-khe',
        name: tpl?.name ?? 'Quả Khế',
        category: 'CROP',
        unitSell: tpl?.sellPrice ?? this.KHE_PRICE,
        asset: tpl?.asset ?? '/game-assets/nongtrai/pixel/qua-khe.png',
      }, fruit);
    });
    return { harvested: fruit };
  }

  // ──────────────────────────────────────────────
  // ĐẤT — mở khoá theo cấp (5 ô ban đầu, +1 mỗi cấp, tối đa 50). KHÔNG mua bằng coin.
  // ──────────────────────────────────────────────
  private unlockedPlots(level: number) {
    return Math.min(MAX_PLOTS, START_PLOTS + Math.max(0, level));
  }

  // Tạo đủ các ô đất đã được mở khoá (không bao giờ xoá ô đã có).
  private async ensurePlots(characterId: string, level: number) {
    const target = this.unlockedPlots(level);
    const count = await this.prisma.farmPlot.count({ where: { characterId } });
    if (count >= target) return;
    const data = [] as { characterId: string; index: number }[];
    for (let i = count; i < target; i++) data.push({ characterId, index: i });
    if (data.length) await this.prisma.farmPlot.createMany({ data, skipDuplicates: true });
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
  // Xới đất trước khi gieo
  async till(userId: string, plotIndex: number) {
    const char = await this.getCharacter(userId);
    const plot = await this.getPlot(char.id, plotIndex);
    if (plot.cropId) throw new BadRequestException('Ô đất đang có cây');
    if (plot.tilled) return { ok: true, alreadyTilled: true };
    await this.prisma.farmPlot.update({ where: { id: plot.id }, data: { tilled: true } });
    return { ok: true };
  }

  async plant(userId: string, plotIndex: number, cropSlug: string) {
    const char = await this.getCharacter(userId);
    const plot = await this.getPlot(char.id, plotIndex);
    if (plot.cropId) throw new BadRequestException('Ô đất đang có cây');
    if (!plot.tilled) throw new BadRequestException('Cần xới đất trước khi gieo hạt');
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
        data: { cropId: null, plantedAt: null, readyAt: null, watered: false, tilled: false, health: 100, yield: 0 },
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
          // cho phép cho ăn ngay (không chặn bởi cooldown lúc mới mua)
          lastFedAt: new Date(now - tpl.feedCooldownSec * 1000),
        },
      });
    });
    return { ok: true, animal: tpl.name, spent: tpl.buyPrice };
  }

  // Danh sách thức ăn/thuốc bán ở cửa hàng
  listSupplies() { return SUPPLIES; }

  async buySupply(userId: string, slug: string, qty: number) {
    qty = this.assertQty(qty);
    const sup = SUPPLIES.find((s) => s.slug === slug);
    if (!sup) throw new NotFoundException('Vật phẩm không tồn tại');
    const char = await this.getCharacter(userId);
    await this.prisma.$transaction(async (tx) => {
      await this.spendCoin(tx, char.id, sup.price * qty, 'farm_supply', `Mua ${sup.name}`);
      await this.addWarehouse(tx, char.id, { slug: sup.slug, name: sup.name, category: 'SUPPLY', unitSell: 0 }, qty);
    });
    return { ok: true, added: qty };
  }

  async feedAnimal(userId: string, animalId: string) {
    const char = await this.getCharacter(userId);
    const a = await this.getAnimal(char.id, animalId);
    const now = Date.now();
    if (a.sickAt) throw new BadRequestException('Vật nuôi đang bệnh — dùng Thuốc thú y trước khi cho ăn');
    if (a.lastFedAt.getTime() + a.animal.feedCooldownSec * 1000 > now) {
      throw new BadRequestException('Chưa tới giờ cho ăn lại');
    }
    if (a.fedCount >= MAX_FEED) throw new BadRequestException('Đã cho ăn tối đa, hãy thu hoạch sản phẩm');
    const feedSlug = FEED_OF[a.animal.slug] || 'feed-livestock';
    const feedName = feedSlug === 'feed-poultry' ? 'Thức ăn gia cầm' : 'Thức ăn gia súc';
    const productReadyAt = a.productReadyAt ?? new Date(Math.max(now, a.grownAt.getTime()));
    const gotSick = Math.random() < SICK_CHANCE;
    await this.prisma.$transaction(async (tx) => {
      await this.consumeWarehouse(tx, char.id, feedSlug, 'SUPPLY', 1, `Hết ${feedName} — mua ở cửa hàng`);
      await tx.farmAnimal.update({
        where: { id: a.id },
        data: { fedCount: { increment: 1 }, lastFedAt: new Date(), productReadyAt, sickAt: gotSick ? new Date() : undefined },
      });
    });
    return { ok: true, fedCount: a.fedCount + 1, sick: gotSick };
  }

  // Chữa bệnh bằng Thuốc thú y
  async cureAnimal(userId: string, animalId: string) {
    const char = await this.getCharacter(userId);
    const a = await this.getAnimal(char.id, animalId);
    if (!a.sickAt) throw new BadRequestException('Vật nuôi không bị bệnh');
    await this.prisma.$transaction(async (tx) => {
      await this.consumeWarehouse(tx, char.id, 'medicine', 'SUPPLY', 1, 'Hết Thuốc thú y — mua ở cửa hàng');
      await tx.farmAnimal.update({ where: { id: a.id }, data: { sickAt: null } });
    });
    return { ok: true };
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
    return Math.min(MAX_FARM_LEVEL, Math.floor(exp / EXP_PER_LEVEL));
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

  private async consumeWarehouse(tx: Prisma.TransactionClient, characterId: string, slug: string, category: string, qty: number, errMsg: string) {
    const item = await tx.warehouseItem.findUnique({ where: { characterId_slug_category: { characterId, slug, category } } });
    if (!item || item.quantity < qty) throw new BadRequestException(errMsg);
    await tx.warehouseItem.update({ where: { id: item.id }, data: { quantity: { decrement: qty } } });
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
