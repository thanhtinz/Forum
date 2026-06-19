import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Câu cá: 1 hồ duy nhất, chia theo ĐỘ SÂU (admin tự thêm). Cần câu có bậc (gate độ sâu),
// thuyền (phải mua, maxDepth + sức chứa). Cá câu được nằm trong khoang thuyền.
const LEVEL_KG = 2000;
const REFILL_SEC = 14400; // 4h hồi cá
const BITE_MIN = 3;
const BITE_MAX = 7;

@Injectable()
export class FishingService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────
  async getState(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    await this.refillStock();

    const [depths, rods, boats, species] = await Promise.all([
      this.prisma.fishDepth.findMany({ orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }] }),
      this.prisma.fishingRod.findMany({ orderBy: [{ tier: 'asc' }, { sortOrder: 'asc' }] }),
      this.prisma.fishingBoat.findMany({ orderBy: [{ maxDepth: 'asc' }, { sortOrder: 'asc' }] }),
      this.prisma.fishSpecies.findMany({ orderBy: [{ depth: 'asc' }, { sortOrder: 'asc' }] }),
    ]);

    const boat = profile.boatSlug ? boats.find((b) => b.slug === profile.boatSlug) ?? null : null;
    const now = Date.now();
    const biteReady = profile.biteAt ? profile.biteAt.getTime() <= now : false;
    const holdCount = await this.prisma.fishCatch.count({
      where: { characterId: char.id, soldAt: null, pondAt: null, onBoat: true },
    });

    return {
      coin: char.coinBalance,
      profile: {
        level: profile.level,
        totalKg: profile.totalKg,
        nextLevelKg: LEVEL_KG,
        totalCaught: profile.totalCaught,
        rodTier: profile.rodTier,
        boatSlug: profile.boatSlug,
        boat: boat ? { slug: boat.slug, name: boat.name, capacity: boat.capacity, maxDepth: boat.maxDepth, asset: boat.asset } : null,
      },
      cast: profile.castDepth != null ? { depth: profile.castDepth, biteAt: profile.biteAt, biteReady } : null,
      depths: depths.map((d) => {
        const reachable = !!boat && boat.maxDepth >= d.depth;
        const rodOk = profile.rodTier >= d.minRodTier;
        return {
          depth: d.depth,
          name: d.name,
          minRodTier: d.minRodTier,
          catchRate: d.catchRate,
          canFish: reachable && rodOk,
          needBoat: !reachable,
          needRodTier: rodOk ? 0 : d.minRodTier,
          species: species.filter((s) => s.depth === d.depth).map((s) => ({
            name: s.name, kgMin: s.kgMin, kgMax: s.kgMax, pricePerKg: s.pricePerKg, asset: s.asset, stock: s.stock,
          })),
        };
      }),
      rods: rods.map((r) => ({ slug: r.slug, name: r.name, tier: r.tier, price: r.price, asset: r.asset, owned: profile.rodTier >= r.tier })),
      boats: boats.map((b) => ({ slug: b.slug, name: b.name, price: b.price, capacity: b.capacity, maxDepth: b.maxDepth, asset: b.asset, owned: profile.boatSlug === b.slug })),
      boatHold: { capacity: boat?.capacity ?? 0, count: holdCount },
    };
  }

  // ──────────────────────────────────────────────
  // MUA CẦN (bậc) — sở hữu bậc cao nhất
  // ──────────────────────────────────────────────
  async buyRod(userId: string, slug: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const rod = await this.prisma.fishingRod.findUnique({ where: { slug } });
    if (!rod) throw new NotFoundException('Cần câu không tồn tại');
    if (profile.rodTier >= rod.tier) throw new BadRequestException('Bạn đã có cần bậc này hoặc cao hơn');
    await this.spendCoin(char.id, rod.price, `fishing_rod_${slug}`, `Mua ${rod.name}`);
    await this.prisma.fishingProfile.update({
      where: { characterId: char.id },
      data: { rodTier: rod.tier },
    });
    return { ok: true, rodTier: rod.tier, spent: rod.price };
  }

  // ──────────────────────────────────────────────
  // MUA / NÂNG CẤP THUYỀN
  // ──────────────────────────────────────────────
  async buyBoat(userId: string, slug: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const boat = await this.prisma.fishingBoat.findUnique({ where: { slug } });
    if (!boat) throw new NotFoundException('Thuyền không tồn tại');
    if (profile.boatSlug === slug) throw new BadRequestException('Bạn đang dùng thuyền này');
    await this.spendCoin(char.id, boat.price, `fishing_boat_${slug}`, `Mua ${boat.name}`);
    await this.prisma.fishingProfile.update({
      where: { characterId: char.id },
      data: { boatSlug: slug },
    });
    return { ok: true, boatSlug: slug, spent: boat.price };
  }

  // ──────────────────────────────────────────────
  // THẢ CẦN (theo độ sâu)
  // ──────────────────────────────────────────────
  async cast(userId: string, depth: number) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    await this.refillStock();

    const d = await this.prisma.fishDepth.findUnique({ where: { depth } });
    if (!d) throw new BadRequestException('Độ sâu không tồn tại');
    if (!profile.boatSlug) throw new BadRequestException('Bạn cần mua thuyền trước khi ra câu');
    const boat = await this.prisma.fishingBoat.findUnique({ where: { slug: profile.boatSlug } });
    if (!boat || boat.maxDepth < depth) throw new BadRequestException('Thuyền của bạn chưa ra được độ sâu này — nâng cấp thuyền');
    if (profile.rodTier < d.minRodTier) throw new BadRequestException(`Cần câu bậc ${d.minRodTier} trở lên mới câu được độ sâu này`);
    if (profile.castDepth != null) throw new BadRequestException('Bạn đang thả cần, hãy giật cá trước');

    const holdCount = await this.prisma.fishCatch.count({ where: { characterId: char.id, soldAt: null, pondAt: null, onBoat: true } });
    if (holdCount >= boat.capacity) throw new BadRequestException('Khoang thuyền đã đầy — chuyển cá về kho hoặc bán bớt');

    const stock = await this.prisma.fishSpecies.aggregate({ where: { depth: { lte: depth } }, _sum: { stock: true } });
    if ((stock._sum.stock ?? 0) <= 0) throw new BadRequestException('Hồ tạm hết cá, chờ hồi cá');

    const delay = BITE_MIN + Math.floor(Math.random() * (BITE_MAX - BITE_MIN + 1));
    const biteAt = new Date(Date.now() + delay * 1000);
    await this.prisma.fishingProfile.update({
      where: { characterId: char.id },
      data: { castDepth: depth, biteAt },
    });
    return { ok: true, depth, biteInSec: delay, biteAt };
  }

  // ──────────────────────────────────────────────
  // GIẬT CÁ
  // ──────────────────────────────────────────────
  async reel(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const depth = profile.castDepth;
    if (depth == null) throw new BadRequestException('Bạn chưa thả cần');

    const now = Date.now();
    if (!profile.biteAt || profile.biteAt.getTime() > now) {
      throw new BadRequestException('Cá chưa cắn câu, kiên nhẫn nào');
    }
    const d = await this.prisma.fishDepth.findUnique({ where: { depth } });
    const catchRate = Math.max(0, Math.min(100, d?.catchRate ?? 70)) / 100;

    // Trượt theo tỷ lệ độ sâu
    if (Math.random() > catchRate) {
      await this.prisma.fishingProfile.update({
        where: { characterId: char.id },
        data: { castDepth: null, biteAt: null, lastCatchAt: new Date() },
      });
      return { ok: true, caught: false, message: 'Cá đã sảy mất!' };
    }

    // Cá có depth <= độ sâu đang câu (độ sâu lớn vẫn ra được cá nhỏ ở tầng nông)
    const candidates = await this.prisma.fishSpecies.findMany({ where: { depth: { lte: depth }, stock: { gt: 0 } } });
    if (candidates.length === 0) {
      await this.prisma.fishingProfile.update({ where: { characterId: char.id }, data: { castDepth: null, biteAt: null } });
      throw new BadRequestException('Hồ đã hết cá');
    }
    // Cá càng đắt càng hiếm → cá nhỏ phổ biến kể cả khi câu sâu
    const weighted = candidates.map((c) => ({ c, w: Math.max(1, Math.round(1000 / Math.max(1, c.pricePerKg))) }));
    const totalW = weighted.reduce((s, x) => s + x.w, 0);
    let roll = Math.random() * totalW;
    let species = weighted[0].c;
    for (const x of weighted) { roll -= x.w; if (roll <= 0) { species = x.c; break; } }
    const weight = species.kgMin + Math.floor(Math.random() * (species.kgMax - species.kgMin + 1));

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.fishSpecies.update({ where: { id: species.id }, data: { stock: { decrement: 1 } } });
      await tx.fishCatch.create({ data: { characterId: char.id, speciesId: species.id, weightKg: weight, onBoat: true } });

      const newTotalKg = profile.totalKg + weight;
      let level = profile.level;
      let remainKg = newTotalKg;
      let rewardCoin = 0;
      while (remainKg >= LEVEL_KG) {
        remainKg -= LEVEL_KG;
        level += 1;
        rewardCoin += 100 + Math.floor(Math.random() * 501);
      }
      await tx.fishingProfile.update({
        where: { characterId: char.id },
        data: { totalKg: remainKg, totalCaught: { increment: 1 }, level, castDepth: null, biteAt: null, lastCatchAt: new Date() },
      });
      if (rewardCoin > 0) await this.addCoin(tx, char.id, rewardCoin, 'fishing_levelup', 'Thưởng lên cấp câu cá');
      return { level, leveledUp: level > profile.level, rewardCoin };
    });

    return { ok: true, caught: true, fish: { name: species.name, weightKg: weight, asset: species.asset }, ...result };
  }

  // ──────────────────────────────────────────────
  // KHOANG THUYỀN (cá đang trên thuyền)
  // ──────────────────────────────────────────────
  async boatHold(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const boat = profile.boatSlug ? await this.prisma.fishingBoat.findUnique({ where: { slug: profile.boatSlug } }) : null;
    const catches = await this.prisma.fishCatch.findMany({
      where: { characterId: char.id, soldAt: null, pondAt: null, onBoat: true },
      orderBy: { caughtAt: 'desc' },
      include: { species: { select: { name: true, pricePerKg: true, asset: true } } },
    });
    return {
      capacity: boat?.capacity ?? 0,
      count: catches.length,
      fishes: catches.map((c) => ({ id: c.id, name: c.species.name, weightKg: c.weightKg, value: c.weightKg * c.species.pricePerKg, asset: c.species.asset })),
    };
  }

  // Chuyển 1 con (hoặc tất cả nếu không truyền id) từ khoang thuyền về kho
  async moveToKho(userId: string, catchId?: string) {
    const char = await this.getCharacter(userId);
    if (catchId) {
      const fish = await this.prisma.fishCatch.findFirst({ where: { id: catchId, characterId: char.id, soldAt: null, onBoat: true } });
      if (!fish) throw new NotFoundException('Không tìm thấy cá trên thuyền');
      await this.prisma.fishCatch.update({ where: { id: fish.id }, data: { onBoat: false } });
      return { ok: true, moved: 1 };
    }
    const r = await this.prisma.fishCatch.updateMany({
      where: { characterId: char.id, soldAt: null, pondAt: null, onBoat: true },
      data: { onBoat: false },
    });
    return { ok: true, moved: r.count };
  }

  // Bán toàn bộ cá trên khoang thuyền
  async sellBoatAll(userId: string) {
    const char = await this.getCharacter(userId);
    const catches = await this.prisma.fishCatch.findMany({
      where: { characterId: char.id, soldAt: null, pondAt: null, onBoat: true },
      include: { species: { select: { pricePerKg: true } } },
    });
    if (catches.length === 0) return { ok: true, sold: 0, value: 0 };
    const value = catches.reduce((s, c) => s + c.weightKg * c.species.pricePerKg, 0);
    await this.prisma.$transaction(async (tx) => {
      await tx.fishCatch.updateMany({ where: { characterId: char.id, soldAt: null, pondAt: null, onBoat: true }, data: { soldAt: new Date() } });
      await this.addCoin(tx, char.id, value, 'fishing_sell_boat', 'Bán cá trên thuyền');
    });
    return { ok: true, sold: catches.length, value };
  }

  // ──────────────────────────────────────────────
  // KHO CÁ (đã chuyển về kho) + BÁN — dùng cho trang Kho chung
  // ──────────────────────────────────────────────
  async storage(userId: string) {
    const char = await this.getCharacter(userId);
    const catches = await this.prisma.fishCatch.findMany({
      where: { characterId: char.id, soldAt: null, pondAt: null, onBoat: false },
      orderBy: { caughtAt: 'desc' },
      include: { species: { select: { name: true, pricePerKg: true, asset: true } } },
    });
    return catches.map((c) => ({
      id: c.id,
      name: c.species.name,
      weightKg: c.weightKg,
      value: c.weightKg * c.species.pricePerKg,
      asset: c.species.asset,
      caughtAt: c.caughtAt,
    }));
  }

  async sell(userId: string, catchId: string) {
    const char = await this.getCharacter(userId);
    const fish = await this.prisma.fishCatch.findFirst({
      where: { id: catchId, characterId: char.id, soldAt: null, pondAt: null },
      include: { species: { select: { pricePerKg: true } } },
    });
    if (!fish) throw new NotFoundException('Không tìm thấy cá hoặc đã bán');
    const value = fish.weightKg * fish.species.pricePerKg;
    await this.prisma.$transaction(async (tx) => {
      await tx.fishCatch.update({ where: { id: fish.id }, data: { soldAt: new Date() } });
      await this.addCoin(tx, char.id, value, 'fishing_sell', 'Bán cá');
    });
    return { ok: true, value };
  }

  async sellAll(userId: string) {
    const char = await this.getCharacter(userId);
    const catches = await this.prisma.fishCatch.findMany({
      where: { characterId: char.id, soldAt: null, pondAt: null, onBoat: false },
      include: { species: { select: { pricePerKg: true } } },
    });
    if (catches.length === 0) return { ok: true, sold: 0, value: 0 };
    const value = catches.reduce((s, c) => s + c.weightKg * c.species.pricePerKg, 0);
    await this.prisma.$transaction(async (tx) => {
      await tx.fishCatch.updateMany({ where: { characterId: char.id, soldAt: null, pondAt: null, onBoat: false }, data: { soldAt: new Date() } });
      await this.addCoin(tx, char.id, value, 'fishing_sell_all', 'Bán toàn bộ cá');
    });
    return { ok: true, sold: catches.length, value };
  }

  // ──────────────────────────────────────────────
  // HỒ NUÔI CÁ — thả cá (đã ở kho) vào hồ, lớn dần, bán giá cao hơn
  // ──────────────────────────────────────────────
  private readonly POND_GROWTH_PER_HR = 0.05;
  private readonly POND_MAX_MULT = 3;
  private readonly POND_CAPACITY = 50;

  private pondWeight(fish: { weightKg: number; pondAt: Date | null }) {
    if (!fish.pondAt) return fish.weightKg;
    const hrs = (Date.now() - fish.pondAt.getTime()) / 3_600_000;
    const mult = Math.min(this.POND_MAX_MULT, 1 + this.POND_GROWTH_PER_HR * hrs);
    return Math.max(fish.weightKg, Math.round(fish.weightKg * mult));
  }

  async pond(userId: string) {
    const char = await this.getCharacter(userId);
    const fishes = await this.prisma.fishCatch.findMany({
      where: { characterId: char.id, soldAt: null, pondAt: { not: null } },
      orderBy: { pondAt: 'asc' },
      include: { species: { select: { name: true, pricePerKg: true, asset: true } } },
    });
    return {
      capacity: this.POND_CAPACITY,
      count: fishes.length,
      maxMult: this.POND_MAX_MULT,
      fishes: fishes.map((f) => {
        const grown = this.pondWeight(f);
        const matured = grown >= f.weightKg * this.POND_MAX_MULT;
        return { id: f.id, name: f.species.name, asset: f.species.asset, startKg: f.weightKg, currentKg: grown, value: grown * f.species.pricePerKg, matured, pondAt: f.pondAt };
      }),
    };
  }

  async releaseToPond(userId: string, catchId: string) {
    const char = await this.getCharacter(userId);
    const inPond = await this.prisma.fishCatch.count({ where: { characterId: char.id, soldAt: null, pondAt: { not: null } } });
    if (inPond >= this.POND_CAPACITY) throw new BadRequestException('Hồ đã đầy');
    const fish = await this.prisma.fishCatch.findFirst({ where: { id: catchId, characterId: char.id, soldAt: null, pondAt: null } });
    if (!fish) throw new NotFoundException('Không tìm thấy cá trong kho');
    await this.prisma.fishCatch.update({ where: { id: fish.id }, data: { pondAt: new Date(), onBoat: false } });
    return { ok: true };
  }

  async releaseAllToPond(userId: string) {
    const char = await this.getCharacter(userId);
    const inPond = await this.prisma.fishCatch.count({ where: { characterId: char.id, soldAt: null, pondAt: { not: null } } });
    const slot = this.POND_CAPACITY - inPond;
    if (slot <= 0) throw new BadRequestException('Hồ đã đầy');
    const ids = (await this.prisma.fishCatch.findMany({
      where: { characterId: char.id, soldAt: null, pondAt: null, onBoat: false },
      orderBy: { caughtAt: 'asc' }, take: slot, select: { id: true },
    })).map((f) => f.id);
    if (ids.length === 0) return { ok: true, moved: 0 };
    await this.prisma.fishCatch.updateMany({ where: { id: { in: ids } }, data: { pondAt: new Date() } });
    return { ok: true, moved: ids.length };
  }

  async harvestPond(userId: string, catchId: string) {
    const char = await this.getCharacter(userId);
    const fish = await this.prisma.fishCatch.findFirst({
      where: { id: catchId, characterId: char.id, soldAt: null, pondAt: { not: null } },
      include: { species: { select: { pricePerKg: true } } },
    });
    if (!fish) throw new NotFoundException('Không tìm thấy cá trong hồ');
    const grown = this.pondWeight(fish);
    const value = grown * fish.species.pricePerKg;
    await this.prisma.$transaction(async (tx) => {
      await tx.fishCatch.update({ where: { id: fish.id }, data: { soldAt: new Date() } });
      await this.addCoin(tx, char.id, value, 'pond_harvest', 'Thu hoạch cá hồ nuôi');
    });
    return { ok: true, weightKg: grown, value };
  }

  async harvestPondAll(userId: string) {
    const char = await this.getCharacter(userId);
    const fishes = await this.prisma.fishCatch.findMany({
      where: { characterId: char.id, soldAt: null, pondAt: { not: null } },
      include: { species: { select: { pricePerKg: true } } },
    });
    if (fishes.length === 0) return { ok: true, sold: 0, value: 0 };
    const value = fishes.reduce((s, f) => s + this.pondWeight(f) * f.species.pricePerKg, 0);
    await this.prisma.$transaction(async (tx) => {
      await tx.fishCatch.updateMany({ where: { id: { in: fishes.map((f) => f.id) } }, data: { soldAt: new Date() } });
      await this.addCoin(tx, char.id, value, 'pond_harvest_all', 'Thu hoạch toàn bộ cá hồ nuôi');
    });
    return { ok: true, sold: fishes.length, value };
  }

  async leaderboard(limit = 10) {
    const rows = await this.prisma.fishingProfile.findMany({
      take: Math.min(Math.max(limit, 1), 50),
      orderBy: [{ totalCaught: 'desc' }, { level: 'desc' }],
      include: { character: { select: { user: { select: { username: true, displayName: true } } } } },
    });
    return rows.map((r, i) => ({
      rank: i + 1,
      username: r.character.user.username,
      displayName: r.character.user.displayName,
      level: r.level,
      totalCaught: r.totalCaught,
    }));
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  private async getCharacter(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Bạn chưa tạo nhân vật game');
    return char;
  }

  private async getProfile(characterId: string) {
    const existing = await this.prisma.fishingProfile.findUnique({ where: { characterId } });
    if (existing) return existing;
    return this.prisma.fishingProfile.create({ data: { characterId } });
  }

  // Hồi cá cho loài hết stock sau 4h
  private async refillStock() {
    const now = new Date();
    const empties = await this.prisma.fishSpecies.findMany({
      where: { OR: [{ nextRefillAt: null }, { nextRefillAt: { lte: now } }], stock: { lte: 0 } },
    });
    for (const s of empties) {
      await this.prisma.fishSpecies.update({
        where: { id: s.id },
        data: { stock: s.refillCount, nextRefillAt: new Date(now.getTime() + REFILL_SEC * 1000) },
      });
    }
  }

  private async spendCoin(characterId: string, amount: number, refId: string, note: string) {
    await this.prisma.$transaction(async (tx) => {
      const char = await tx.gameCharacter.findUnique({ where: { id: characterId }, select: { coinBalance: true } });
      if (!char) throw new NotFoundException();
      if (char.coinBalance < amount) throw new BadRequestException('Không đủ coin');
      const balanceAfter = char.coinBalance - amount;
      await tx.gameCharacter.update({ where: { id: characterId }, data: { coinBalance: balanceAfter } });
      await tx.coinTransaction.create({
        data: { characterId, type: 'spend_fishing', amount: -amount, balanceBefore: char.coinBalance, balanceAfter, refId, note },
      });
    });
  }

  private async addCoin(tx: Prisma.TransactionClient, characterId: string, amount: number, refId: string, note: string) {
    const char = await tx.gameCharacter.findUnique({ where: { id: characterId }, select: { coinBalance: true } });
    if (!char) throw new NotFoundException();
    const balanceAfter = char.coinBalance + amount;
    await tx.gameCharacter.update({ where: { id: characterId }, data: { coinBalance: balanceAfter } });
    await tx.coinTransaction.create({
      data: { characterId, type: 'earn_fishing', amount, balanceBefore: char.coinBalance, balanceAfter, refId, note },
    });
  }
}
