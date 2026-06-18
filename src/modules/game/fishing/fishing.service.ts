import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// Hằng số game (viết lại từ mod câu cá WAP gốc, quy toàn bộ Xu -> coin)
const ROD_PRICE: Record<number, number> = { 1: 2000, 2: 5000, 3: 7000 };
const BAIT_PRICE: Record<number, number> = { 1: 250, 2: 500, 3: 700 };
const BAIT_USES_PER_PACK = 100;
const BITE_RANGE: Record<number, [number, number]> = {
  1: [3, 6],
  2: [4, 7],
  3: [5, 8],
};
const MISS_CHANCE = 0.1; // 10% cá chạy mất
const CATCH_COOLDOWN_SEC = 0; // theo game gốc: quăng ~3s, giật, lặp lại liên tục
const LEVEL_KG = 2000; // tích đủ 2000kg -> lên 1 cấp
const REFILL_SEC = 14400; // 4h hồi cá

@Injectable()
export class FishingService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // STATE — hồ sơ + tình trạng các khu + lần thả hiện tại
  // ──────────────────────────────────────────────
  async getState(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    await this.refillZones();

    const species = await this.prisma.fishSpecies.findMany({
      orderBy: [{ zone: 'asc' }, { sortOrder: 'asc' }],
    });

    const now = Date.now();
    const biteReady = profile.biteAt ? profile.biteAt.getTime() <= now : false;

    return {
      coin: char.coinBalance,
      profile: {
        level: profile.level,
        totalKg: profile.totalKg,
        nextLevelKg: LEVEL_KG,
        totalCaught: profile.totalCaught,
        ownedRods: profile.ownedRods,
        bait: { 1: profile.bait1, 2: profile.bait2, 3: profile.bait3 },
      },
      cast: profile.castZone
        ? { zone: profile.castZone, biteAt: profile.biteAt, biteReady }
        : null,
      zones: [1, 2, 3].map((z) => ({
        zone: z,
        rodPrice: ROD_PRICE[z],
        baitPrice: BAIT_PRICE[z],
        hasRod: profile.ownedRods.includes(z),
        species: species
          .filter((s) => s.zone === z)
          .map((s) => ({
            id: s.id,
            name: s.name,
            kgMin: s.kgMin,
            kgMax: s.kgMax,
            pricePerKg: s.pricePerKg,
            stock: s.stock,
            asset: s.asset,
          })),
      })),
    };
  }

  // ──────────────────────────────────────────────
  // MUA CẦN (1 lần / khu)
  // ──────────────────────────────────────────────
  async buyRod(userId: string, zone: number) {
    this.assertZone(zone);
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    if (profile.ownedRods.includes(zone)) {
      throw new BadRequestException('Bạn đã có cần cho khu này');
    }
    const price = ROD_PRICE[zone];
    await this.spendCoin(char.id, price, `fishing_rod_${zone}`, 'Mua cần câu');
    await this.prisma.fishingProfile.update({
      where: { characterId: char.id },
      data: { ownedRods: { push: zone } },
    });
    return { ok: true, zone, spent: price };
  }

  // ──────────────────────────────────────────────
  // MUA MỒI (mỗi gói = 100 lượt)
  // ──────────────────────────────────────────────
  async buyBait(userId: string, zone: number, packs = 1) {
    this.assertZone(zone);
    if (!Number.isInteger(packs) || packs < 1 || packs > 50) {
      throw new BadRequestException('Số gói mồi không hợp lệ (1-50)');
    }
    const char = await this.getCharacter(userId);
    await this.getProfile(char.id);
    const cost = BAIT_PRICE[zone] * packs;
    await this.spendCoin(char.id, cost, `fishing_bait_${zone}`, 'Mua mồi câu');
    const field = `bait${zone}` as 'bait1' | 'bait2' | 'bait3';
    const uses = BAIT_USES_PER_PACK * packs;
    await this.prisma.fishingProfile.update({
      where: { characterId: char.id },
      data: { [field]: { increment: uses } },
    });
    return { ok: true, zone, added: uses, spent: cost };
  }

  // ──────────────────────────────────────────────
  // THẢ CẦN
  // ──────────────────────────────────────────────
  async cast(userId: string, zone: number) {
    this.assertZone(zone);
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    await this.refillZones();

    if (!profile.ownedRods.includes(zone)) {
      throw new BadRequestException('Bạn chưa có cần cho khu này');
    }
    if (this.baitOf(profile, zone) <= 0) {
      throw new BadRequestException('Bạn đã hết mồi cho khu này');
    }
    if (profile.castZone) {
      throw new BadRequestException('Bạn đang thả cần, hãy giật cá trước');
    }
    const stock = await this.prisma.fishSpecies.aggregate({
      where: { zone },
      _sum: { stock: true },
    });
    if ((stock._sum.stock ?? 0) <= 0) {
      throw new BadRequestException('Khu này đã hết cá, chờ hồi cá');
    }

    const [min, max] = BITE_RANGE[zone];
    const delay = min + Math.floor(Math.random() * (max - min + 1));
    const biteAt = new Date(Date.now() + delay * 1000);
    await this.prisma.fishingProfile.update({
      where: { characterId: char.id },
      data: { castZone: zone, biteAt },
    });
    return { ok: true, zone, biteInSec: delay, biteAt };
  }

  // ──────────────────────────────────────────────
  // GIẬT CÁ
  // ──────────────────────────────────────────────
  async reel(userId: string) {
    const char = await this.getCharacter(userId);
    const profile = await this.getProfile(char.id);
    const zone = profile.castZone;
    if (!zone) throw new BadRequestException('Bạn chưa thả cần');

    const now = Date.now();
    if (!profile.biteAt || profile.biteAt.getTime() > now) {
      throw new BadRequestException('Cá chưa cắn câu, kiên nhẫn nào');
    }
    if (
      profile.lastCatchAt &&
      profile.lastCatchAt.getTime() + CATCH_COOLDOWN_SEC * 1000 > now
    ) {
      throw new BadRequestException('Giật quá nhanh, chờ chút (40s/lần)');
    }
    if (this.baitOf(profile, zone) <= 0) {
      throw new BadRequestException('Hết mồi');
    }

    const baitField = `bait${zone}` as 'bait1' | 'bait2' | 'bait3';

    // Trượt 10% -> mất 1 mồi, cá chạy mất
    if (Math.random() < MISS_CHANCE) {
      await this.prisma.fishingProfile.update({
        where: { characterId: char.id },
        data: {
          [baitField]: { decrement: 1 },
          castZone: null,
          biteAt: null,
          lastCatchAt: new Date(),
        },
      });
      return { ok: true, caught: false, message: 'Cá đã chạy mất!' };
    }

    // Chọn loài còn stock trong khu
    const candidates = await this.prisma.fishSpecies.findMany({
      where: { zone, stock: { gt: 0 } },
    });
    if (candidates.length === 0) {
      await this.prisma.fishingProfile.update({
        where: { characterId: char.id },
        data: { castZone: null, biteAt: null },
      });
      throw new BadRequestException('Khu đã hết cá');
    }
    // Random theo trọng số (theo game gốc): cá càng đắt càng hiếm
    const weighted = candidates.map((c) => ({ c, w: Math.max(1, Math.round(1000 / Math.max(1, c.pricePerKg))) }));
    const totalW = weighted.reduce((s, x) => s + x.w, 0);
    let roll = Math.random() * totalW;
    let species = weighted[0].c;
    for (const x of weighted) { roll -= x.w; if (roll <= 0) { species = x.c; break; } }
    const weight =
      species.kgMin +
      Math.floor(Math.random() * (species.kgMax - species.kgMin + 1));

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.fishSpecies.update({
        where: { id: species.id },
        data: { stock: { decrement: 1 } },
      });
      await tx.fishCatch.create({
        data: { characterId: char.id, speciesId: species.id, weightKg: weight },
      });

      const newTotalKg = profile.totalKg + weight;
      let level = profile.level;
      let remainKg = newTotalKg;
      let rewardCoin = 0;
      while (remainKg >= LEVEL_KG) {
        remainKg -= LEVEL_KG;
        level += 1;
        rewardCoin += 100 + Math.floor(Math.random() * 501); // 100-600
      }

      await tx.fishingProfile.update({
        where: { characterId: char.id },
        data: {
          [baitField]: { decrement: 1 },
          totalKg: remainKg,
          totalCaught: { increment: 1 },
          level,
          castZone: null,
          biteAt: null,
          lastCatchAt: new Date(),
        },
      });

      if (rewardCoin > 0) {
        await this.addCoin(tx, char.id, rewardCoin, 'fishing_levelup', 'Thưởng lên cấp câu cá');
      }

      return { level, leveledUp: level > profile.level, rewardCoin };
    });

    return {
      ok: true,
      caught: true,
      fish: { name: species.name, weightKg: weight },
      ...result,
    };
  }

  // ──────────────────────────────────────────────
  // KHO CÁ + BÁN
  // ──────────────────────────────────────────────
  async storage(userId: string) {
    const char = await this.getCharacter(userId);
    const catches = await this.prisma.fishCatch.findMany({
      where: { characterId: char.id, soldAt: null, pondAt: null },
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
      where: { characterId: char.id, soldAt: null, pondAt: null },
      include: { species: { select: { pricePerKg: true } } },
    });
    if (catches.length === 0) return { ok: true, sold: 0, value: 0 };
    const value = catches.reduce((s, c) => s + c.weightKg * c.species.pricePerKg, 0);
    await this.prisma.$transaction(async (tx) => {
      await tx.fishCatch.updateMany({
        where: { characterId: char.id, soldAt: null, pondAt: null },
        data: { soldAt: new Date() },
      });
      await this.addCoin(tx, char.id, value, 'fishing_sell_all', 'Bán toàn bộ cá');
    });
    return { ok: true, sold: catches.length, value };
  }

  // ──────────────────────────────────────────────
  // HỒ NUÔI CÁ — thả cá câu được vào hồ, cá lớn dần rồi thu hoạch bán giá cao hơn
  // ──────────────────────────────────────────────
  private readonly POND_GROWTH_PER_HR = 0.05; // +5% trọng lượng / giờ
  private readonly POND_MAX_MULT = 3;          // tối đa gấp 3 lần
  private readonly POND_CAPACITY = 50;         // sức chứa hồ

  // Trọng lượng hiện tại của cá trong hồ (lớn dần theo thời gian)
  private pondWeight(fish: { weightKg: number; pondAt: Date | null }) {
    if (!fish.pondAt) return fish.weightKg;
    const hrs = (Date.now() - fish.pondAt.getTime()) / 3_600_000;
    const mult = Math.min(this.POND_MAX_MULT, 1 + this.POND_GROWTH_PER_HR * hrs);
    return Math.max(fish.weightKg, Math.round(fish.weightKg * mult));
  }

  // Danh sách cá trong hồ
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
        return {
          id: f.id,
          name: f.species.name,
          asset: f.species.asset,
          startKg: f.weightKg,
          currentKg: grown,
          value: grown * f.species.pricePerKg,
          matured,
          pondAt: f.pondAt,
        };
      }),
    };
  }

  // Thả 1 con cá từ kho vào hồ
  async releaseToPond(userId: string, catchId: string) {
    const char = await this.getCharacter(userId);
    const inPond = await this.prisma.fishCatch.count({ where: { characterId: char.id, soldAt: null, pondAt: { not: null } } });
    if (inPond >= this.POND_CAPACITY) throw new BadRequestException('Hồ đã đầy');
    const fish = await this.prisma.fishCatch.findFirst({ where: { id: catchId, characterId: char.id, soldAt: null, pondAt: null } });
    if (!fish) throw new NotFoundException('Không tìm thấy cá trong kho');
    await this.prisma.fishCatch.update({ where: { id: fish.id }, data: { pondAt: new Date() } });
    return { ok: true };
  }

  // Thả toàn bộ cá trong kho vào hồ (đến khi đầy)
  async releaseAllToPond(userId: string) {
    const char = await this.getCharacter(userId);
    const inPond = await this.prisma.fishCatch.count({ where: { characterId: char.id, soldAt: null, pondAt: { not: null } } });
    const slot = this.POND_CAPACITY - inPond;
    if (slot <= 0) throw new BadRequestException('Hồ đã đầy');
    const ids = (await this.prisma.fishCatch.findMany({
      where: { characterId: char.id, soldAt: null, pondAt: null },
      orderBy: { caughtAt: 'asc' }, take: slot, select: { id: true },
    })).map((f) => f.id);
    if (ids.length === 0) return { ok: true, moved: 0 };
    await this.prisma.fishCatch.updateMany({ where: { id: { in: ids } }, data: { pondAt: new Date() } });
    return { ok: true, moved: ids.length };
  }

  // Thu hoạch (bán) 1 con cá trong hồ theo trọng lượng đã lớn
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

  // Thu hoạch toàn bộ cá trong hồ
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
      include: {
        character: { select: { user: { select: { username: true, displayName: true } } } },
      },
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
  private assertZone(zone: number) {
    if (![1, 2, 3].includes(zone)) throw new BadRequestException('Khu không hợp lệ (1-3)');
  }

  private baitOf(p: { bait1: number; bait2: number; bait3: number }, zone: number) {
    return zone === 1 ? p.bait1 : zone === 2 ? p.bait2 : p.bait3;
  }

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

  // Hồi cá cho khu hết stock sau 4h
  private async refillZones() {
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
      const char = await tx.gameCharacter.findUnique({
        where: { id: characterId },
        select: { coinBalance: true },
      });
      if (!char) throw new NotFoundException();
      if (char.coinBalance < amount) throw new BadRequestException('Không đủ coin');
      const balanceAfter = char.coinBalance - amount;
      await tx.gameCharacter.update({ where: { id: characterId }, data: { coinBalance: balanceAfter } });
      await tx.coinTransaction.create({
        data: {
          characterId,
          type: 'spend_fishing',
          amount: -amount,
          balanceBefore: char.coinBalance,
          balanceAfter,
          refId,
          note,
        },
      });
    });
  }

  // dùng trong transaction sẵn có
  private async addCoin(
    tx: Prisma.TransactionClient,
    characterId: string,
    amount: number,
    refId: string,
    note: string,
  ) {
    const char = await tx.gameCharacter.findUnique({
      where: { id: characterId },
      select: { coinBalance: true },
    });
    if (!char) throw new NotFoundException();
    const balanceAfter = char.coinBalance + amount;
    await tx.gameCharacter.update({ where: { id: characterId }, data: { coinBalance: balanceAfter } });
    await tx.coinTransaction.create({
      data: {
        characterId,
        type: 'earn_fishing',
        amount,
        balanceBefore: char.coinBalance,
        balanceAfter,
        refId,
        note,
      },
    });
  }
}
