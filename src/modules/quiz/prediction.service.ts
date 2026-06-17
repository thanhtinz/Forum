import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CharacterService } from '../game/character/character.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ── Hằng số ──
const CATEGORIES = ['ANIME', 'MANGA', 'GAME', 'ESPORTS', 'SPORTS', 'TECH', 'CRYPTO', 'COMMUNITY', 'OTHER'];
const MARKET_TYPES = ['BINARY', 'MULTI', 'HANDICAP', 'OVERUNDER', 'ONEXTWO', 'ODDEVEN', 'EXACT', 'CUSTOM'];
const ODDS_MODES = ['POOL', 'FIXED'];
const VISIBILITIES = ['PUBLIC', 'PRIVATE', 'FRIENDS', 'GUILD'];

const USER_BASIC = { id: true, username: true, displayName: true, avatar: true } as const;
const REACTION_EMOJIS = ['👍', '🔥', '😂', '😮', '😢', '💰'];

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
  resultSource?: string;
  externalRef?: string;
}

@Injectable()
export class PredictionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly character: CharacterService,
    private readonly notif: NotificationsService,
    private readonly events: EventEmitter2,
  ) {}

  // Phát sự kiện realtime tới phòng của kèo (livestream)
  private async emitLive(predictionId: string, type: string, extra: Record<string, any> = {}) {
    try {
      const p = await this.prisma.prediction.findUnique({
        where: { id: predictionId },
        select: { options: true, oddsMode: true, fixedOdds: true, commissionBps: true, status: true, correctIndex: true,
          bets: { select: { optionIndex: true, amount: true, status: true } } },
      });
      if (!p) return;
      const options = p.options as string[];
      const { totals, counts, pool } = this.optionTotals(options, p.bets || []);
      const snapshot = {
        pool,
        optionTotals: totals,
        optionCounts: counts,
        odds: this.displayOdds(p, totals, pool),
        betCount: (p.bets || []).filter((b: any) => b.status !== 'CASHED_OUT' && b.status !== 'REFUNDED').length,
        status: p.status,
        correctIndex: p.correctIndex,
      };
      this.events.emit('prediction.live', { predictionId, type, snapshot, ...extra });
    } catch { /* không chặn nghiệp vụ */ }
  }

  // Kiểm tra quyền xem/tham gia theo chế độ hiển thị (FRIENDS / GUILD)
  private async assertCanAccess(p: any, userId?: string) {
    if (p.visibility === 'PUBLIC' || p.visibility === 'PRIVATE') return; // PRIVATE gate bằng mật khẩu khi cược
    if (userId && userId === p.createdBy) return;
    if (!userId) throw new ForbiddenException('Kèo này giới hạn người tham gia');
    if (p.visibility === 'FRIENDS') {
      const f = await this.prisma.friendship.findFirst({
        where: { OR: [{ userId: p.createdBy, friendId: userId }, { userId, friendId: p.createdBy }] },
        select: { userId: true },
      });
      if (!f) throw new ForbiddenException('Chỉ bạn bè của người tạo mới tham gia được kèo này');
    } else if (p.visibility === 'GUILD') {
      if (!p.guildId) return;
      const char = await this.prisma.gameCharacter.findUnique({ where: { userId }, select: { id: true } });
      if (!char) throw new ForbiddenException('Chỉ thành viên guild mới tham gia được kèo này');
      const member = await this.prisma.guildMember.findFirst({ where: { guildId: p.guildId, characterId: char.id }, select: { id: true } });
      if (!member) throw new ForbiddenException('Chỉ thành viên guild mới tham gia được kèo này');
    }
  }

  // Gửi thông báo (bỏ qua lỗi để không chặn quyết toán)
  private notifySafe(userId: string, title: string, body: string, predictionId: string) {
    this.notif
      .notify(userId, { type: 'SYSTEM', title, body, link: `/prediction?id=${predictionId}`, targetType: 'prediction', targetId: predictionId })
      .catch(() => {});
  }

  // Tự động khoá kèo đã quá hạn đặt cược (lazy, khi đọc)
  private async autoLockExpired(ids: { id: string; status: string; closesAt: Date | null }[]) {
    const now = Date.now();
    const expired = ids.filter((p) => p.status === 'OPEN' && p.closesAt && p.closesAt.getTime() <= now).map((p) => p.id);
    if (expired.length) {
      await this.prisma.prediction.updateMany({ where: { id: { in: expired } }, data: { status: 'LOCKED' } }).catch(() => {});
    }
    return new Set(expired);
  }

  // ──────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────
  private optionTotals(options: string[], bets: { optionIndex: number; amount: number; status?: string }[]) {
    const totals = options.map(() => 0);
    const counts = options.map(() => 0);
    let pool = 0;
    for (const b of bets) {
      // Bỏ qua vé đã bán sớm / hoàn (không tính vào quỹ)
      if (b.status === 'CASHED_OUT' || b.status === 'REFUNDED') continue;
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
      betCount: (p.bets || []).filter((b: any) => b.status !== 'CASHED_OUT' && b.status !== 'REFUNDED').length,
    };
  }

  // ──────────────────────────────────────────────
  // LIST / GET
  // ──────────────────────────────────────────────
  async list(opts: { status?: string; category?: string; marketType?: string; q?: string; mine?: string; sort?: string } = {}, userId?: string) {
    const where: any = {};
    if (opts.status && ['OPEN', 'LOCKED', 'SETTLED', 'CANCELLED'].includes(opts.status)) where.status = opts.status;
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
      take: 200,
      include: {
        bets: { select: { optionIndex: true, amount: true, status: true } },
      },
    });
    const locked = await this.autoLockExpired(preds);
    const views = preds.map((p) => this.toView(locked.has(p.id) ? { ...p, status: 'LOCKED' } : p, userId));
    return this.sortViews(views, opts.sort).slice(0, 100);
  }

  // Sắp xếp danh sách kèo (kèo đang mở luôn ưu tiên trước kèo đã kết thúc)
  private sortViews(views: any[], sort?: string) {
    const live = (s: string) => (s === 'OPEN' ? 0 : s === 'LOCKED' ? 1 : 2);
    const now = Date.now();
    const byNew = (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    let cmp: (a: any, b: any) => number;
    switch (sort) {
      case 'closing':
        cmp = (a, b) => {
          const at = a.closesAt ? new Date(a.closesAt).getTime() : Infinity;
          const bt = b.closesAt ? new Date(b.closesAt).getTime() : Infinity;
          const af = at >= now ? at : Infinity; // đã quá hạn -> xuống cuối
          const bf = bt >= now ? bt : Infinity;
          return af - bf || byNew(a, b);
        };
        break;
      case 'pool':
        cmp = (a, b) => b.pool - a.pool || byNew(a, b);
        break;
      case 'hot':
        cmp = (a, b) => (b.betCount * 2 + b.pool / 100) - (a.betCount * 2 + a.pool / 100) || byNew(a, b);
        break;
      default:
        cmp = byNew;
    }
    return views.sort((a, b) => live(a.status) - live(b.status) || cmp(a, b));
  }

  async get(id: string, userId?: string) {
    const p = await this.prisma.prediction.findUnique({
      where: { id },
      include: { bets: { select: { optionIndex: true, amount: true, status: true } } },
    });
    if (!p) throw new NotFoundException('Kèo không tồn tại');
    await this.assertCanAccess(p, userId);

    const locked = await this.autoLockExpired([p]);
    if (locked.has(p.id)) p.status = 'LOCKED';
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
    const reactions = await this.reactionSummary('PREDICTION', [p.id], userId);
    return { ...view, creator, myBets, isOwner: userId === p.createdBy, reactions: reactions[p.id].counts, myReactions: reactions[p.id].mine };
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
        // Nguồn kết quả ngoài chỉ dành cho admin (kèo hệ thống có provider)
        resultSource: isAdmin && dto.resultSource === 'EXTERNAL' ? 'EXTERNAL' : 'MANUAL',
        externalRef: isAdmin && dto.resultSource === 'EXTERNAL' ? (dto.externalRef?.trim() || null) : null,
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
    // Kèo giới hạn bạn bè / guild
    await this.assertCanAccess(p, userId);
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
    const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: USER_BASIC });
    await this.emitLive(predictionId, 'bet', {
      actor: { displayName: actor?.displayName, username: actor?.username, avatar: actor?.avatar },
      optionIndex, optionLabel: (p.options as string[])[optionIndex], amount, odds,
    });
    return { ok: true, bet: { id: created.id, optionIndex, amount, odds, expectedPayout: expected } };
  }

  // ──────────────────────────────────────────────
  // LOCK / SETTLE / CANCEL
  // ──────────────────────────────────────────────
  // ──────────────────────────────────────────────
  // CASH-OUT (bán vé sớm khi kèo còn mở)
  // ──────────────────────────────────────────────
  // Hoàn lại phần lớn tiền cược, trừ phí thoát sớm; an toàn quỹ vì luôn ≤ tiền đã đặt.
  async cashout(userId: string, betId: string) {
    const EARLY_EXIT_FEE_BPS = 500; // 5%
    const bet = await this.prisma.predictionBet.findUnique({ where: { id: betId }, include: { prediction: true } });
    if (!bet) throw new NotFoundException('Vé cược không tồn tại');
    if (bet.userId !== userId) throw new ForbiddenException('Không phải vé của bạn');
    if (bet.status !== 'ACTIVE') throw new BadRequestException('Vé này không thể bán');
    const p = bet.prediction;
    if (p.status !== 'OPEN') throw new BadRequestException('Chỉ bán được khi kèo đang mở');
    if (p.closesAt && p.closesAt.getTime() <= Date.now()) throw new BadRequestException('Kèo đã hết hạn, không thể bán');

    const refund = Math.floor(bet.amount * (1 - EARLY_EXIT_FEE_BPS / 10000));

    // Trả lại thanh khoản đã giữ cho nhà cái (kèo FIXED của user)
    if (p.oddsMode === 'FIXED' && !p.isAdminMarket) {
      const reserved = Math.round(bet.amount * (bet.odds - 1));
      await this.prisma.prediction.update({ where: { id: p.id }, data: { creatorEscrow: { increment: reserved } } }).catch(() => {});
    }

    await this.character.adjustCoinByUser(userId, 'prediction_cashout', refund, 'Bán vé cược sớm', p.id);
    await this.prisma.predictionBet.update({ where: { id: betId }, data: { status: 'CASHED_OUT', payout: refund } });
    await this.emitLive(p.id, 'cashout', { optionIndex: bet.optionIndex });
    return { ok: true, refund, fee: bet.amount - refund };
  }

  // ──────────────────────────────────────────────
  // PARLAY (cược xiên — chỉ kèo nhà cái hệ thống, FIXED)
  // ──────────────────────────────────────────────
  async placeParlay(userId: string, legs: { predictionId: string; optionIndex: number }[], amount: number) {
    amount = Math.round(Number(amount) || 0);
    if (amount <= 0) throw new BadRequestException('Số coin phải lớn hơn 0');
    if (!Array.isArray(legs) || legs.length < 2) throw new BadRequestException('Cược xiên cần ít nhất 2 kèo');
    if (legs.length > 12) throw new BadRequestException('Tối đa 12 kèo trong một vé xiên');
    const ids = legs.map((l) => l.predictionId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Không thể chọn cùng một kèo hai lần');

    const preds = await this.prisma.prediction.findMany({ where: { id: { in: ids } } });
    const byId = new Map(preds.map((p) => [p.id, p]));
    let combined = 1;
    const legData: { predictionId: string; optionIndex: number; odds: number }[] = [];
    const now = Date.now();
    for (const l of legs) {
      const p = byId.get(l.predictionId);
      if (!p) throw new BadRequestException('Kèo không tồn tại trong vé');
      if (p.oddsMode !== 'FIXED' || !p.isAdminMarket) throw new BadRequestException('Cược xiên chỉ áp dụng cho kèo nhà cái hệ thống (odds cố định)');
      if (p.status !== 'OPEN') throw new BadRequestException(`Kèo «${p.title}» đã đóng cược`);
      if (p.closesAt && p.closesAt.getTime() <= now) throw new BadRequestException(`Kèo «${p.title}» đã hết hạn`);
      const opts = p.options as string[];
      if (l.optionIndex < 0 || l.optionIndex >= opts.length) throw new BadRequestException('Lựa chọn không hợp lệ');
      const odds = Number((p.fixedOdds as number[])?.[l.optionIndex]) || 0;
      if (!(odds > 1)) throw new BadRequestException('Odds không hợp lệ');
      combined *= odds;
      legData.push({ predictionId: p.id, optionIndex: l.optionIndex, odds });
    }
    combined = Number(combined.toFixed(2));
    const potentialPayout = Math.floor(amount * combined);

    try {
      await this.character.adjustCoinByUser(userId, 'parlay_bet', -amount, 'Đặt cược xiên', undefined);
    } catch (e: any) {
      throw new BadRequestException(e?.message || 'Không đủ coin');
    }
    const parlay = await this.prisma.parlayBet.create({
      data: {
        userId, amount, combinedOdds: combined, potentialPayout, status: 'ACTIVE',
        legs: { create: legData },
      },
      include: { legs: true },
    });
    return { ok: true, parlayId: parlay.id, combinedOdds: combined, potentialPayout };
  }

  async myParlays(userId: string) {
    const rows = await this.prisma.parlayBet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { legs: { include: { prediction: { select: { id: true, title: true, options: true, status: true, correctIndex: true } } } } },
    });
    return rows;
  }

  // Cập nhật các vé xiên liên quan khi một kèo được chốt/huỷ
  private async resolveParlaysForPrediction(predictionId: string, outcome: { cancelled?: boolean; correctIndex?: number }) {
    const legs = await this.prisma.parlayLeg.findMany({
      where: { predictionId, parlay: { status: 'ACTIVE' } },
      select: { id: true, parlayId: true, optionIndex: true },
    });
    if (!legs.length) return;
    for (const leg of legs) {
      const status = outcome.cancelled ? 'VOID' : leg.optionIndex === outcome.correctIndex ? 'WON' : 'LOST';
      await this.prisma.parlayLeg.update({ where: { id: leg.id }, data: { status } });
    }
    const parlayIds = [...new Set(legs.map((l) => l.parlayId))];
    for (const pid of parlayIds) await this.tryResolveParlay(pid);
  }

  private async tryResolveParlay(parlayId: string) {
    const parlay = await this.prisma.parlayBet.findUnique({ where: { id: parlayId }, include: { legs: true } });
    if (!parlay || parlay.status !== 'ACTIVE') return;
    const legs = parlay.legs;
    if (legs.some((l) => l.status === 'LOST')) {
      await this.prisma.parlayBet.update({ where: { id: parlayId }, data: { status: 'LOST', payout: 0, settledAt: new Date() } });
      this.notifySafe(parlay.userId, 'Vé xiên không trúng', `Vé xiên ${legs.length} kèo của bạn đã thua.`, legs[0]?.predictionId || '');
      return;
    }
    if (legs.some((l) => l.status === 'PENDING')) return; // còn kèo chưa có kết quả
    // Tất cả đã WON/VOID
    const wonLegs = legs.filter((l) => l.status === 'WON');
    if (wonLegs.length === 0) {
      await this.character.adjustCoinByUser(parlay.userId, 'parlay_refund', parlay.amount, 'Hoàn vé xiên (toàn bộ huỷ)', undefined);
      await this.prisma.parlayBet.update({ where: { id: parlayId }, data: { status: 'REFUNDED', payout: parlay.amount, settledAt: new Date() } });
      this.notifySafe(parlay.userId, 'Vé xiên được hoàn', `Toàn bộ kèo trong vé bị huỷ, hoàn ${parlay.amount.toLocaleString()} coin.`, '');
      return;
    }
    const effectiveOdds = wonLegs.reduce((s, l) => s * l.odds, 1);
    const payout = Math.floor(parlay.amount * effectiveOdds);
    await this.character.adjustCoinByUser(parlay.userId, 'parlay_win', payout, 'Thắng cược xiên', undefined);
    await this.prisma.parlayBet.update({ where: { id: parlayId }, data: { status: 'WON', payout, settledAt: new Date() } });
    this.notifySafe(parlay.userId, '🎉 Thắng cược xiên!', `Vé xiên ${wonLegs.length} kèo thắng, nhận ${payout.toLocaleString()} coin (x${effectiveOdds.toFixed(2)}).`, '');
  }

  private async ownerOrModOrThrow(id: string, userId: string, isMod: boolean) {
    const p = await this.prisma.prediction.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Kèo không tồn tại');
    if (p.createdBy !== userId && !isMod) throw new ForbiddenException('Không có quyền với kèo này');
    return p;
  }

  async lock(id: string, userId: string, isMod: boolean) {
    const p = await this.ownerOrModOrThrow(id, userId, isMod);
    if (p.status === 'SETTLED' || p.status === 'CANCELLED') throw new BadRequestException('Kèo đã kết thúc');
    const updated = await this.prisma.prediction.update({ where: { id }, data: { status: 'LOCKED' } });
    await this.emitLive(id, 'lock');
    return updated;
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

    const updated = await this.prisma.prediction.update({
      where: { id },
      data: { status: 'SETTLED', correctIndex, settledAt: new Date(), resultNote: note?.trim() || null },
    });
    await this.resolveParlaysForPrediction(id, { correctIndex });
    await this.emitLive(id, 'settle', { correctIndex });
    return updated;
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
        this.notifySafe(b.userId, 'Kèo hoàn coin', `Kèo «${p.title}» không có người thắng, hoàn ${b.amount.toLocaleString()} coin.`, p.id);
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
        this.notifySafe(b.userId, '🎉 Thắng kèo dự đoán', `Bạn thắng kèo «${p.title}» và nhận ${payout.toLocaleString()} coin!`, p.id);
      } else {
        await this.prisma.predictionBet.update({ where: { id: b.id }, data: { payout: 0, status: 'LOST' } });
      }
    }
    // Hoa hồng: kèo user → người tạo nhận; kèo admin → hệ thống giữ
    if (commission > 0 && !p.isAdminMarket) {
      await this.character.adjustCoinByUser(p.createdBy, 'prediction_commission', commission, 'Hoa hồng tạo kèo', p.id);
      this.notifySafe(p.createdBy, 'Hoa hồng tạo kèo', `Kèo «${p.title}» đã chốt, bạn nhận ${commission.toLocaleString()} coin hoa hồng.`, p.id);
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
        this.notifySafe(b.userId, '🎉 Thắng kèo dự đoán', `Bạn thắng kèo «${p.title}» (x${b.odds.toFixed(2)}) và nhận ${payout.toLocaleString()} coin!`, p.id);
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
      this.notifySafe(b.userId, 'Kèo đã huỷ', `Kèo «${p.title}» đã bị huỷ, hoàn ${b.amount.toLocaleString()} coin.`, p.id);
    }
    // Trả lại ký quỹ cho người tạo
    if (p.creatorStake > 0) {
      await this.character.adjustCoinByUser(p.createdBy, 'prediction_stake_refund', p.creatorStake, 'Hoàn ký quỹ (huỷ kèo)', p.id);
    }
    const updated = await this.prisma.prediction.update({
      where: { id },
      data: { status: 'CANCELLED', resultNote: reason?.trim() || null, creatorEscrow: 0 },
    });
    await this.resolveParlaysForPrediction(id, { cancelled: true });
    await this.emitLive(id, 'cancel');
    return updated;
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
  // ──────────────────────────────────────────────
  // REACTIONS (emoji cho kèo & bình luận)
  // ──────────────────────────────────────────────
  // Tổng hợp reaction cho nhiều target -> { [targetId]: { counts: {emoji:n}, mine: string[] } }
  private async reactionSummary(targetType: string, ids: string[], userId?: string) {
    const out: Record<string, { counts: Record<string, number>; mine: string[] }> = {};
    for (const id of ids) out[id] = { counts: {}, mine: [] };
    if (!ids.length) return out;
    const rows = await this.prisma.predictionReaction.findMany({
      where: { targetType, targetId: { in: ids } },
      select: { targetId: true, emoji: true, userId: true },
    });
    for (const r of rows) {
      const slot = out[r.targetId];
      if (!slot) continue;
      slot.counts[r.emoji] = (slot.counts[r.emoji] || 0) + 1;
      if (userId && r.userId === userId) slot.mine.push(r.emoji);
    }
    return out;
  }

  async toggleReaction(userId: string, targetType: string, targetId: string, emoji: string) {
    if (!['PREDICTION', 'COMMENT'].includes(targetType)) throw new BadRequestException('Loại không hợp lệ');
    if (!REACTION_EMOJIS.includes(emoji)) throw new BadRequestException('Emoji không hợp lệ');
    // Xác thực target tồn tại
    if (targetType === 'PREDICTION') {
      const ok = await this.prisma.prediction.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!ok) throw new NotFoundException('Kèo không tồn tại');
    } else {
      const ok = await this.prisma.predictionComment.findUnique({ where: { id: targetId }, select: { id: true } });
      if (!ok) throw new NotFoundException('Bình luận không tồn tại');
    }
    const existing = await this.prisma.predictionReaction.findUnique({
      where: { targetType_targetId_userId_emoji: { targetType, targetId, userId, emoji } },
    });
    if (existing) {
      await this.prisma.predictionReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.predictionReaction.create({ data: { targetType, targetId, userId, emoji } });
    }
    const summary = await this.reactionSummary(targetType, [targetId], userId);
    return { reacted: !existing, ...summary[targetId] };
  }

  // ──────────────────────────────────────────────
  // THẢO LUẬN
  // ──────────────────────────────────────────────
  async listComments(predictionId: string, userId?: string) {
    const exists = await this.prisma.prediction.findUnique({ where: { id: predictionId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Kèo không tồn tại');
    const rows = await this.prisma.predictionComment.findMany({
      where: { predictionId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      include: { user: { select: USER_BASIC } },
    });
    const reactions = await this.reactionSummary('COMMENT', rows.map((r) => r.id), userId);
    const view = rows.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      content: c.isDeleted ? null : c.content,
      isDeleted: c.isDeleted,
      createdAt: c.createdAt,
      user: c.isDeleted ? null : c.user,
      reactions: reactions[c.id]?.counts || {},
      myReactions: reactions[c.id]?.mine || [],
    }));
    // Gom theo cây 1 cấp
    const roots = view.filter((c) => !c.parentId);
    const byParent = new Map<string, typeof view>();
    for (const c of view) {
      if (c.parentId) {
        const arr = byParent.get(c.parentId) || [];
        arr.push(c);
        byParent.set(c.parentId, arr);
      }
    }
    return roots.map((r) => ({ ...r, replies: byParent.get(r.id) || [] }));
  }

  async addComment(predictionId: string, userId: string, content: string, parentId?: string) {
    const text = String(content || '').trim();
    if (!text) throw new BadRequestException('Nội dung trống');
    if (text.length > 2000) throw new BadRequestException('Bình luận quá dài (tối đa 2000 ký tự)');
    const p = await this.prisma.prediction.findUnique({ where: { id: predictionId }, select: { id: true } });
    if (!p) throw new NotFoundException('Kèo không tồn tại');
    if (parentId) {
      const parent = await this.prisma.predictionComment.findUnique({ where: { id: parentId }, select: { id: true, predictionId: true, parentId: true } });
      if (!parent || parent.predictionId !== predictionId) throw new BadRequestException('Bình luận gốc không hợp lệ');
      if (parent.parentId) parentId = parent.parentId; // chỉ lồng 1 cấp
    }
    const c = await this.prisma.predictionComment.create({
      data: { predictionId, userId, content: text, parentId: parentId || null },
      include: { user: { select: USER_BASIC } },
    });

    // Thông báo
    const full = await this.prisma.prediction.findUnique({ where: { id: predictionId }, select: { title: true, createdBy: true } });
    const who = c.user?.displayName || c.user?.username || 'Ai đó';
    if (parentId) {
      const parent = await this.prisma.predictionComment.findUnique({ where: { id: parentId }, select: { userId: true } });
      if (parent && parent.userId !== userId) {
        this.notifySafe(parent.userId, `${who} đã trả lời bình luận của bạn`, `Trong kèo «${full?.title || ''}»`, predictionId);
      }
    } else if (full && full.createdBy !== userId) {
      this.notifySafe(full.createdBy, `${who} đã bình luận về kèo của bạn`, `«${full.title}»`, predictionId);
    }

    const payload = { id: c.id, parentId: c.parentId, content: c.content, isDeleted: false, createdAt: c.createdAt, user: c.user, reactions: {}, myReactions: [], replies: [] };
    this.events.emit('prediction.live', { predictionId, type: 'comment', comment: payload });
    return payload;
  }

  async deleteComment(commentId: string, userId: string, isMod: boolean) {
    const c = await this.prisma.predictionComment.findUnique({ where: { id: commentId } });
    if (!c) throw new NotFoundException('Bình luận không tồn tại');
    if (c.userId !== userId && !isMod) throw new ForbiddenException('Không có quyền xoá');
    await this.prisma.predictionComment.update({ where: { id: commentId }, data: { isDeleted: true } });
    return { ok: true };
  }

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

  // ──────────────────────────────────────────────
  // PHÂN TÍCH CHO NGƯỜI TẠO KÈO
  // ──────────────────────────────────────────────
  async analytics(id: string, userId: string, isMod: boolean) {
    const p = await this.ownerOrModOrThrow(id, userId, isMod);
    const bets = await this.prisma.predictionBet.findMany({ where: { predictionId: id } });
    const counted = bets.filter((b) => b.status !== 'CASHED_OUT' && b.status !== 'REFUNDED');
    const options = p.options as string[];
    const optionTotals = options.map(() => 0);
    const optionCounts = options.map(() => 0);
    for (const b of counted) {
      if (b.optionIndex >= 0 && b.optionIndex < options.length) {
        optionTotals[b.optionIndex] += b.amount;
        optionCounts[b.optionIndex] += 1;
      }
    }
    const totalStaked = counted.reduce((s, b) => s + b.amount, 0);
    const uniqueBettors = new Set(counted.map((b) => b.userId)).size;
    const cashedOut = bets.filter((b) => b.status === 'CASHED_OUT').length;

    let result: any = null;
    if (p.status === 'SETTLED') {
      const won = bets.filter((b) => b.status === 'WON');
      const paidOut = won.reduce((s, b) => s + b.payout, 0);
      if (p.oddsMode === 'POOL') {
        const commission = p.isAdminMarket ? 0 : Math.floor((totalStaked * (p.commissionBps || 0)) / 10000);
        result = { winners: won.length, paidOut, commissionEarned: commission };
      } else {
        // FIXED: P/L của nhà cái = tiền cược - tiền trả thưởng (+ ký quỹ với kèo user)
        const bookProfit = totalStaked - paidOut;
        result = { winners: won.length, paidOut, bookProfit, isHouse: p.isAdminMarket };
      }
    }
    return {
      id: p.id, title: p.title, status: p.status, oddsMode: p.oddsMode, isAdminMarket: p.isAdminMarket,
      options, optionTotals, optionCounts, totalStaked, uniqueBettors, betCount: counted.length, cashedOut, result,
    };
  }

  async creatorStats(userId: string) {
    const markets = await this.prisma.prediction.findMany({ where: { createdBy: userId }, select: { id: true, status: true } });
    const byStatus: Record<string, number> = {};
    for (const m of markets) byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    const ids = markets.map((m) => m.id);
    let totalVolume = 0;
    let totalParticipants = 0;
    if (ids.length) {
      const agg = await this.prisma.predictionBet.aggregate({
        where: { predictionId: { in: ids }, status: { notIn: ['CASHED_OUT', 'REFUNDED'] } },
        _sum: { amount: true },
      });
      totalVolume = agg._sum.amount || 0;
      const bettors = await this.prisma.predictionBet.findMany({ where: { predictionId: { in: ids } }, select: { userId: true }, distinct: ['userId'] });
      totalParticipants = bettors.length;
    }
    return {
      totalMarkets: markets.length,
      open: byStatus['OPEN'] || 0,
      locked: byStatus['LOCKED'] || 0,
      settled: byStatus['SETTLED'] || 0,
      cancelled: byStatus['CANCELLED'] || 0,
      totalVolume,
      totalParticipants,
    };
  }

  // ──────────────────────────────────────────────
  // TÁC VỤ TỰ ĐỘNG (chạy theo lịch)
  // ──────────────────────────────────────────────
  // Khoá hàng loạt kèo quá hạn đặt cược
  async autoLockAll() {
    const now = new Date();
    const r = await this.prisma.prediction.updateMany({
      where: { status: 'OPEN', closesAt: { not: null, lte: now } },
      data: { status: 'LOCKED' },
    });
    return r.count;
  }

  // Khung tự quyết toán theo nguồn kết quả ngoài.
  // Hiện chưa gắn provider thật (cần API key + network); trả về kết quả "no-op" có log.
  async resolveExternalPending(): Promise<{ checked: number; settled: number; note: string }> {
    const candidates = await this.prisma.prediction.findMany({
      where: { status: { in: ['OPEN', 'LOCKED'] }, resultSource: 'EXTERNAL', autoSettleAt: { not: null, lte: new Date() } },
      select: { id: true, externalRef: true },
      take: 50,
    });
    let settled = 0;
    for (const c of candidates) {
      const outcome = await this.fetchExternalResult(c.externalRef);
      if (outcome == null) continue; // chưa có provider / chưa có kết quả
      await this.settle(c.id, outcome, 'system', true, 'Tự quyết toán từ nguồn ngoài').catch(() => {});
      settled++;
    }
    return { checked: candidates.length, settled, note: candidates.length && !settled ? 'Chưa cấu hình provider kết quả ngoài' : 'OK' };
  }

  // Điểm cắm provider kết quả ngoài (thể thao/crypto…). Trả index cửa thắng, hoặc null nếu chưa có.
  // TODO: nối API thật (cần khoá & network). Hiện trả null.
  private async fetchExternalResult(_externalRef: string | null): Promise<number | null> {
    return null;
  }
}
