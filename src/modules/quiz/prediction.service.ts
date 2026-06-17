import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CharacterService } from '../game/character/character.service';

// ── Hằng số ──
const CATEGORIES = ['ANIME', 'MANGA', 'GAME', 'ESPORTS', 'SPORTS', 'TECH', 'CRYPTO', 'COMMUNITY', 'OTHER'];
const MARKET_TYPES = ['BINARY', 'MULTI', 'HANDICAP', 'OVERUNDER', 'ONEXTWO', 'ODDEVEN', 'EXACT', 'CUSTOM'];
const ODDS_MODES = ['POOL', 'FIXED'];
const VISIBILITIES = ['PUBLIC', 'PRIVATE', 'FRIENDS', 'GUILD'];

const USER_BASIC = { id: true, username: true, displayName: true, avatar: true } as const;

export interface CreatePredictionDto {
  title: string;
  description?: string;
  options: string[];
  category?: string;
  marketType?: string;
  oddsMode?: string;
  fixedOdds?: number[];
  line?: number | null;
  visibility?: string;
  joinPassword?: string;
  guildId?: string;
  image?: string;
  banner?: string;
  tags?: string[];
  opensAt?: string | null;
  closesAt?: string | null;
  resultAt?: string | null;
  autoSettleAt?: string | null;
  minBet?: number;
  maxBet?: number | null;
  commissionBps?: number;
  creatorStake?: number;
  isAdminMarket?: boolean;
}

@Injectable()
export class PredictionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
  ) {}

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────
  private optionTotals(options: string[], bets: { optionIndex: number; amount: number }[]) {
    const totals = options.map(() => 0);
    const counts = options.map(() => 0);
    let pool = 0;
    for (const b of bets) {
      if (b.optionIndex >= 0 && b.optionIndex < totals.length) {
        totals[b.optionIndex] += b.amount;
        counts[b.optionIndex] += 1;
      }
      pool += b.amount;
    }
    return { totals, counts, pool };
  }

  // Odds hiển thị: FIXED -> fixedOdds; POOL -> pari-mutuel ước tính theo dòng tiền
  private displayOdds(p: any, totals: number[], pool: number): number[] {
    if (p.oddsMode === 'FIXED' && Array.isArray(p.fixedOdds)) {
      return (p.fixedOdds as number[]).map((o) => Number(o) || 0);
    }
    const commission = (pool * (p.commissionBps || 0)) / 10000;
    const distributable = Math.max(0, pool - commission);
    return totals.map((t) => (t > 0 ? Number((distributable / t).toFixed(2)) : 0));
  }

  private rankOf(settledBets: number, profit: number): string {
    if (settledBets >= 200 && profit >= 100000) return 'LEGEND';
    if (settledBets >= 100 && profit >= 30000) return 'GRANDMASTER';
    if (settledBets >= 50 && profit >= 8000) return 'MASTER';
    if (settledBets >= 15) return 'CHALLENGER';
    return 'ROOKIE';
  }

  private toView(p: any, userId?: string) {
    const options = p.options as string[];
    const { totals, counts, pool } = this.optionTotals(options, p.bets || []);
    const { joinPassword, ...rest } = p;
    return {
      ...rest,
      hasPassword: !!joinPassword,
      options,
      optionTotals: totals,
      optionCounts: counts,
      pool,
      odds: this.displayOdds(p, totals, pool),
      betCount: (p.bets || []).length,
    };
  }

  // ──────────────────────────────────────────────
  // LIST / GET
  // ──────────────────────────────────────────────
  async list(opts: { status?: string; category?: string; marketType?: string; q?: string; mine?: string } = {}, userId?: string) {
    const where: any = {};
    if (opts.status && ['OPEN', 'LOCKED', 'RESULT_PENDING', 'SETTLED', 'CANCELLED', 'DISPUTED'].includes(opts.status)) where.status = opts.status;
    if (opts.category && CATEGORIES.includes(opts.category)) where.category = opts.category;
    if (opts.marketType && MARKET_TYPES.includes(opts.marketType)) where.marketType = opts.marketType;
    if (opts.q?.trim()) where.title = { contains: opts.q.trim(), mode: 'insensitive' };

    if (opts.mine === '1' && userId) {
      where.createdBy = userId;
    } else {
      // Danh sách công khai: chỉ kèo PUBLIC (kèo riêng tư truy cập bằng link)
      where.visibility = 'PUBLIC';
    }

    const preds = await this.prisma.prediction.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        bets: { select: { optionIndex: true, amount: true } },
      },
    });
    return preds.map((p) => this.toView(p, userId));
  }

  async get(id: string, userId?: string) {
    const p = await this.prisma.prediction.findUnique({
      where: { id },
      include: { bets: { select: { optionIndex: true, amount: true } } },
    });
    if (!p) throw new NotFoundException('Kèo không tồn tại');

    const view = this.toView(p, userId);
    let myBets: { id: string; optionIndex: number; amount: number; odds: number; payout: number; status: string }[] = [];
    if (userId) {
      const bs = await this.prisma.predictionBet.findMany({
        where: { predictionId: id, userId },
        orderBy: { createdAt: 'desc' },
      });
      myBets = bs.map((b) => ({ id: b.id, optionIndex: b.optionIndex, amount: b.amount, odds: b.odds, payout: b.payout, status: b.status }));
    }
    const creator = await this.prisma.user.findUnique({ where: { id: p.createdBy }, select: USER_BASIC });
    return { ...view, creator, myBets, isOwner: userId === p.createdBy };
  }

  // ──────────────────────────────────────────────
  // CREATE (mọi user; admin có thể tạo kèo nhà cái hệ thống)
  // ──────────────────────────────────────────────
  async create(dto: CreatePredictionDto, createdBy: string, isAdmin: boolean) {
    const options = (dto.options || []).map((o) => String(o).trim()).filter(Boolean);
    if (options.length < 2) throw new BadRequestException('Cần ít nhất 2 lựa chọn');
    if (options.length > 20) throw new BadRequestException('Tối đa 20 lựa chọn');
    const title = String(dto.title || '').trim();
    if (!title) throw new BadRequestException('Thiếu tiêu đề');

    const category = CATEGORIES.includes(dto.category!) ? dto.category! : 'OTHER';
    const marketType = MARKET_TYPES.includes(dto.marketType!) ? dto.marketType! : 'BINARY';
    const oddsMode = ODDS_MODES.includes(dto.oddsMode!) ? dto.oddsMode! : 'POOL';
    const visibility = VISIBILITIES.includes(dto.visibility!) ? dto.visibility! : 'PUBLIC';
    const isAdminMarket = !!dto.isAdminMarket && isAdmin;
    const commissionBps = Math.max(0, Math.min(2000, Math.round(Number(dto.commissionBps) || 0)));
    const minBet = Math.max(1, Math.round(Number(dto.minBet) || 1));
    const maxBet = dto.maxBet != null && Number(dto.maxBet) > 0 ? Math.round(Number(dto.maxBet)) : null;
    if (maxBet != null && maxBet < minBet) throw new BadRequestException('Cược tối đa phải ≥ tối thiểu');

    let fixedOdds: number[] | null = null;
    let creatorStake = 0;
    if (oddsMode === 'FIXED') {
      const odds = (dto.fixedOdds || []).map((o) => Number(o));
      if (odds.length !== options.length || odds.some((o) => !(o > 1))) {
        throw new BadRequestException('Cần nhập odds (> 1) cho mỗi lựa chọn');
      }
      fixedOdds = odds.map((o) => Number(o.toFixed(2)));
      // Kèo FIXED do user tổ chức: phải ký quỹ coin làm nhà cái
      if (!isAdminMarket) {
        creatorStake = Math.round(Number(dto.creatorStake) || 0);
        if (creatorStake <= 0) throw new BadRequestException('Kèo nhà cái (FIXED) cần ký quỹ coin để chi trả');
      }
    }

    // Trừ ký quỹ của người tạo (nếu có)
    if (creatorStake > 0) {
      try {
        await this.character.adjustCoinByUser(createdBy, 'prediction_create_stake', -creatorStake, 'Ký quỹ tạo kèo', undefined);
      } catch (e: any) {
        throw new BadRequestException(e?.message || 'Không đủ coin để ký quỹ');
      }
    }

    return this.prisma.prediction.create({
      data: {
        title,
        description: dto.description?.trim() || null,
        options,
        category,
        marketType,
        oddsMode,
        fixedOdds: fixedOdds ?? undefined,
        line: dto.line != null ? Number(dto.line) : null,
        isAdminMarket,
        creatorStake,
        creatorEscrow: creatorStake,
        visibility,
        joinPassword: visibility === 'PRIVATE' ? (dto.joinPassword || null) : null,
        guildId: visibility === 'GUILD' ? (dto.guildId || null) : null,
        image: dto.image || null,
        banner: dto.banner || null,
        tags: (dto.tags || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 10),
        opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        resultAt: dto.resultAt ? new Date(dto.resultAt) : null,
        autoSettleAt: dto.autoSettleAt ? new Date(dto.autoSettleAt) : null,
        minBet,
        maxBet,
        commissionBps,
        status: 'OPEN',
        createdBy,
      },
    });
  }

  // ──────────────────────────────────────────────
  // BET
  // ──────────────────────────────────────────────
  async bet(userId: string, predictionId: string, optionIndex: number, amount: number, password?: string) {
    const p = await this.prisma.prediction.findUnique({ where: { id: predictionId } });
    if (!p) throw new NotFoundException('Kèo không tồn tại');
    if (p.status !== 'OPEN') throw new BadRequestException('Kèo đã đóng cược');
    if (p.opensAt && p.opensAt.getTime() > Date.now()) throw new BadRequestException('Kèo chưa mở cược');
    if (p.closesAt && p.closesAt.getTime() <= Date.now()) throw new BadRequestException('Đã hết hạn đặt cược');

    // Kèo riêng tư cần mật khẩu
    if (p.visibility === 'PRIVATE' && p.joinPassword && p.joinPassword !== password) {
      throw new ForbiddenException('Sai mật khẩu kèo riêng tư');
    }
    // Người tạo không tự cược kèo của mình (trừ kèo nhà cái hệ thống)
    if (p.createdBy === userId && !p.isAdminMarket) {
      throw new BadRequestException('Người tạo không thể đặt cược kèo của mình');
    }

    const options = p.options as string[];
    if (typeof optionIndex !== 'number' || optionIndex < 0 || optionIndex >= options.length) {
      throw new BadRequestException('Lựa chọn không hợp lệ');
    }
    amount = Math.round(Number(amount) || 0);
    if (amount <= 0) throw new BadRequestException('Số coin phải lớn hơn 0');
    if (amount < p.minBet) throw new BadRequestException(`Cược tối thiểu ${p.minBet} coin`);
    if (p.maxBet != null && amount > p.maxBet) throw new BadRequestException(`Cược tối đa ${p.maxBet} coin`);

    // FIXED: khoá odds + kiểm tra thanh khoản nhà cái (kèo user)
    let odds = 0;
    if (p.oddsMode === 'FIXED') {
      const fo = p.fixedOdds as number[];
      odds = Number(fo?.[optionIndex]) || 0;
      if (!(odds > 1)) throw new BadRequestException('Odds không hợp lệ');
      const profit = Math.round(amount * (odds - 1));
      if (!p.isAdminMarket) {
        if (p.creatorEscrow < profit) throw new BadRequestException('Nhà cái không đủ thanh khoản cho cửa này');
        await this.prisma.prediction.update({ where: { id: predictionId }, data: { creatorEscrow: { decrement: profit } } });
      }
    }

    // Trừ coin người cược
    try {
      await this.character.adjustCoinByUser(userId, 'prediction_bet', -amount, 'Đặt cược dự đoán', predictionId);
    } catch (e: any) {
      // hoàn lại reservation nếu FIXED user market
      if (p.oddsMode === 'FIXED' && !p.isAdminMarket) {
        const profit = Math.round(amount * (odds - 1));
        await this.prisma.prediction.update({ where: { id: predictionId }, data: { creatorEscrow: { increment: profit } } }).catch(() => {});
      }
      throw new BadRequestException(e?.message || 'Không đủ coin');
    }

    const created = await this.prisma.predictionBet.create({
      data: { predictionId, userId, optionIndex, amount, odds, status: 'ACTIVE' },
    });
    const expected = p.oddsMode === 'FIXED' ? Math.round(amount * odds) : 0;
    return { ok: true, bet: { id: created.id, optionIndex, amount, odds, expectedPayout: expected } };
  }

  // ──────────────────────────────────────────────
  // LOCK / SETTLE / CANCEL
  // ──────────────────────────────────────────────
  private async ownerOrModOrThrow(id: string, userId: string, isMod: boolean) {
    const p = await this.prisma.prediction.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Kèo không tồn tại');
    if (p.createdBy !== userId && !isMod) throw new ForbiddenException('Không có quyền với kèo này');
    return p;
  }

  async lock(id: string, userId: string, isMod: boolean) {
    const p = await this.ownerOrModOrThrow(id, userId, isMod);
    if (p.status === 'SETTLED' || p.status === 'CANCELLED') throw new BadRequestException('Kèo đã kết thúc');
    return this.prisma.prediction.update({ where: { id }, data: { status: 'LOCKED' } });
  }

  async settle(id: string, correctIndex: number, userId: string, isMod: boolean, note?: string) {
    const p = await this.ownerOrModOrThrow(id, userId, isMod);
    if (p.status === 'SETTLED' || p.status === 'CANCELLED') throw new BadRequestException('Kèo đã kết thúc');

    const options = p.options as string[];
    if (typeof correctIndex !== 'number' || correctIndex < 0 || correctIndex >= options.length) {
      throw new BadRequestException('Kết quả không hợp lệ');
    }
    const bets = await this.prisma.predictionBet.findMany({ where: { predictionId: id, status: 'ACTIVE' } });

    if (p.oddsMode === 'FIXED') {
      await this.settleFixed(p, bets, correctIndex);
    } else {
      await this.settlePool(p, bets, correctIndex);
    }

    return this.prisma.prediction.update({
      where: { id },
      data: { status: 'SETTLED', correctIndex, settledAt: new Date(), resultNote: note?.trim() || null },
    });
  }

  // Pari-mutuel: người thua góp quỹ chia người thắng; hoa hồng về người tạo (kèo user) hoặc hệ thống (admin)
  private async settlePool(p: any, bets: any[], correctIndex: number) {
    const totalPool = bets.reduce((s, b) => s + b.amount, 0);
    const winners = bets.filter((b) => b.optionIndex === correctIndex);
    const winnersStake = winners.reduce((s, b) => s + b.amount, 0);

    if (winnersStake === 0) {
      // Không ai thắng → hoàn toàn bộ
      for (const b of bets) {
        await this.character.adjustCoinByUser(b.userId, 'prediction_refund', b.amount, 'Hoàn coin (không ai thắng)', p.id);
        await this.prisma.predictionBet.update({ where: { id: b.id }, data: { payout: b.amount, status: 'REFUNDED' } });
      }
      return;
    }

    const commission = Math.floor((totalPool * (p.commissionBps || 0)) / 10000);
    const distributable = totalPool - commission;
    for (const b of bets) {
      if (b.optionIndex === correctIndex) {
        const payout = Math.floor((b.amount / winnersStake) * distributable);
        await this.character.adjustCoinByUser(b.userId, 'prediction_win', payout, 'Thắng kèo dự đoán', p.id);
        await this.prisma.predictionBet.update({ where: { id: b.id }, data: { payout, status: 'WON' } });
      } else {
        await this.prisma.predictionBet.update({ where: { id: b.id }, data: { payout: 0, status: 'LOST' } });
      }
    }
    // Hoa hồng: kèo user → người tạo nhận; kèo admin → hệ thống giữ
    if (commission > 0 && !p.isAdminMarket) {
      await this.character.adjustCoinByUser(p.createdBy, 'prediction_commission', commission, 'Hoa hồng tạo kèo', p.id);
    }
  }

  // Fixed odds: người thắng nhận amount*odds. Kèo user: chi từ ký quỹ + tiền người thua; trả phần dư cho nhà cái.
  private async settleFixed(p: any, bets: any[], correctIndex: number) {
    let totalStakes = 0;
    let totalWinnerPayout = 0;
    for (const b of bets) {
      totalStakes += b.amount;
      if (b.optionIndex === correctIndex) {
        const payout = Math.round(b.amount * b.odds);
        totalWinnerPayout += payout;
        await this.character.adjustCoinByUser(b.userId, 'prediction_win', payout, 'Thắng kèo (FIXED)', p.id);
        await this.prisma.predictionBet.update({ where: { id: b.id }, data: { payout, status: 'WON' } });
      } else {
        await this.prisma.predictionBet.update({ where: { id: b.id }, data: { payout: 0, status: 'LOST' } });
      }
    }

    if (!p.isAdminMarket) {
      // Quỹ khả dụng = tiền người cược + ký quỹ người tạo. Phần dư trả lại nhà cái.
      const available = totalStakes + (p.creatorStake || 0);
      let leftover = available - totalWinnerPayout;
      if (leftover < 0) leftover = 0; // an toàn (đã chặn ở bước cược)
      // Hoa hồng hệ thống trên lãi của nhà cái (nếu có lãi)
      const profit = Math.max(0, leftover - (p.creatorStake || 0));
      const commission = Math.floor((profit * (p.commissionBps || 0)) / 10000);
      const credit = leftover - commission;
      if (credit > 0) {
        await this.character.adjustCoinByUser(p.createdBy, 'prediction_book_return', credit, 'Quyết toán nhà cái', p.id);
      }
    }
    // Kèo admin: hệ thống là nhà cái, không cộng/trả cho ai ngoài người thắng.
  }

  async cancel(id: string, userId: string, isMod: boolean, reason?: string) {
    const p = await this.ownerOrModOrThrow(id, userId, isMod);
    if (p.status === 'SETTLED') throw new BadRequestException('Kèo đã quyết toán, không thể huỷ');
    if (p.status === 'CANCELLED') return p;

    const bets = await this.prisma.predictionBet.findMany({ where: { predictionId: id, status: 'ACTIVE' } });
    for (const b of bets) {
      await this.character.adjustCoinByUser(b.userId, 'prediction_refund', b.amount, 'Hoàn coin (huỷ kèo)', p.id);
      await this.prisma.predictionBet.update({ where: { id: b.id }, data: { payout: b.amount, status: 'REFUNDED' } });
    }
    // Trả lại ký quỹ cho người tạo
    if (p.creatorStake > 0) {
      await this.character.adjustCoinByUser(p.createdBy, 'prediction_stake_refund', p.creatorStake, 'Hoàn ký quỹ (huỷ kèo)', p.id);
    }
    return this.prisma.prediction.update({
      where: { id },
      data: { status: 'CANCELLED', resultNote: reason?.trim() || null, creatorEscrow: 0 },
    });
  }

  // Tương thích controller cũ
  async delete(id: string, userId: string, isMod: boolean) {
    await this.cancel(id, userId, isMod, 'Xoá kèo').catch(() => {});
    await this.prisma.predictionBet.deleteMany({ where: { predictionId: id } });
    await this.prisma.prediction.delete({ where: { id } }).catch(() => {});
    return { ok: true };
  }

  // ──────────────────────────────────────────────
  // HỒ SƠ NGƯỜI CHƠI / BXH
  // ──────────────────────────────────────────────
  async myBets(userId: string) {
    const bets = await this.prisma.predictionBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { prediction: { select: { id: true, title: true, status: true, options: true, correctIndex: true, oddsMode: true, category: true } } },
    });
    return bets;
  }

  async playerStats(userId: string) {
    const bets = await this.prisma.predictionBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { amount: true, payout: true, status: true },
    });
    const settled = bets.filter((b) => b.status === 'WON' || b.status === 'LOST');
    const won = settled.filter((b) => b.status === 'WON').length;
    const profit = bets.reduce((s, b) => s + (b.payout - b.amount), 0);
    const totalStaked = bets.reduce((s, b) => s + b.amount, 0);

    // chuỗi thắng/thua dài nhất
    let bestWin = 0, bestLose = 0, curWin = 0, curLose = 0;
    for (const b of settled) {
      if (b.status === 'WON') { curWin++; curLose = 0; bestWin = Math.max(bestWin, curWin); }
      else { curLose++; curWin = 0; bestLose = Math.max(bestLose, curLose); }
    }

    return {
      totalBets: bets.length,
      settledBets: settled.length,
      won,
      lost: settled.length - won,
      winRate: settled.length ? Number(((won / settled.length) * 100).toFixed(1)) : 0,
      profit,
      totalStaked,
      bestWinStreak: bestWin,
      bestLoseStreak: bestLose,
      rank: this.rankOf(settled.length, profit),
    };
  }

  async leaderboard(period: 'week' | 'month' | 'all' = 'week') {
    const since = new Date();
    if (period === 'week') since.setDate(since.getDate() - 7);
    else if (period === 'month') since.setMonth(since.getMonth() - 1);
    else since.setFullYear(2000);

    const bets = await this.prisma.predictionBet.findMany({
      where: { status: { in: ['WON', 'LOST'] }, prediction: { settledAt: { gte: since } } },
      select: { userId: true, amount: true, payout: true, status: true },
    });

    const map = new Map<string, { profit: number; won: number; total: number; staked: number }>();
    for (const b of bets) {
      const cur = map.get(b.userId) || { profit: 0, won: 0, total: 0, staked: 0 };
      cur.profit += b.payout - b.amount;
      cur.staked += b.amount;
      cur.total += 1;
      if (b.status === 'WON') cur.won += 1;
      map.set(b.userId, cur);
    }
    const rows = [...map.entries()]
      .map(([userId, v]) => ({ userId, ...v, winRate: v.total ? Number(((v.won / v.total) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 20);

    const users = await this.prisma.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: USER_BASIC });
    const byId = new Map(users.map((u) => [u.id, u]));

    // Top người tạo kèo (theo số kèo đã quyết toán)
    const creators = await this.prisma.prediction.groupBy({
      by: ['createdBy'],
      where: { status: 'SETTLED', settledAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { createdBy: 'desc' } },
      take: 10,
    });
    const creatorUsers = await this.prisma.user.findMany({ where: { id: { in: creators.map((c) => c.createdBy) } }, select: USER_BASIC });
    const creatorById = new Map(creatorUsers.map((u) => [u.id, u]));

    return {
      players: rows.map((r) => ({ ...r, user: byId.get(r.userId) || null, rank: this.rankOf(r.total, r.profit) })),
      creators: creators.map((c) => ({ userId: c.createdBy, markets: c._count._all, user: creatorById.get(c.createdBy) || null })),
    };
  }
}
