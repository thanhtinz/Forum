import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DiceGames } from './games/dice-games';

// Phòng chung theo vòng (nhiều người) cho Tài Xỉu, Bầu Cua & Đua Thú.
// Mỗi game 1 phòng duy nhất, vòng chạy liên tục: đặt cược -> xóc/đua -> kết quả -> vòng mới.
export type LiveGame = 'tai-xiu' | 'bau-cua' | 'dua-thu';
type Phase = 'betting' | 'rolling' | 'result';
const HOUSE_FEE = 0.05;
const BET_SEC = 25;
const ROLL_SEC = 4;
const RESULT_SEC = 6;
const TAIXIU_OPTS = ['tai', 'xiu'];
const BAUCUA_OPTS = ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'];
const DUATHU_OPTS = ['1', '2', '3', '4', '5', '6', '7']; // 7 làn thú
const HISTORY_MAX = 12;

interface PlayerBets {
  name: string;
  avatar?: string | null;
  bets: { option: string; amount: number }[];
  net?: number;        // lãi/lỗ sau khi chốt vòng
}
export interface HistoryEntry { roundId: number; result: any; at: number }
interface Round {
  game: LiveGame;
  roundId: number;
  phase: Phase;
  endsAt: number;
  result: any | null;          // { dice, total, outcome } | { dice } | { winner }
  players: Map<string, PlayerBets>; // userId -> bets
}

@Injectable()
export class LiveTableService {
  private readonly logger = new Logger(LiveTableService.name);
  private rounds: Record<LiveGame, Round> = {
    'tai-xiu': this.newRound('tai-xiu', 1),
    'bau-cua': this.newRound('bau-cua', 1),
    'dua-thu': this.newRound('dua-thu', 1),
  };
  private history: Record<LiveGame, HistoryEntry[]> = {
    'tai-xiu': [], 'bau-cua': [], 'dua-thu': [],
  };
  // Ngày (giờ VN) của lịch sử hiện tại — đổi ngày thì reset lịch sử
  private historyDay = this.dayKey();

  constructor(private readonly prisma: PrismaService) {}

  private dayKey(): string {
    return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  }

  private newRound(game: LiveGame, roundId: number): Round {
    return { game, roundId, phase: 'betting', endsAt: Date.now() + BET_SEC * 1000, result: null, players: new Map() };
  }

  options(game: LiveGame) {
    return game === 'tai-xiu' ? TAIXIU_OPTS : game === 'bau-cua' ? BAUCUA_OPTS : DUATHU_OPTS;
  }

  private roll(game: LiveGame) {
    if (game === 'tai-xiu') return DiceGames.taiXiu();
    if (game === 'bau-cua') return DiceGames.bauCua();
    return { winner: 1 + Math.floor(Math.random() * 7) }; // đua thú: làn về nhất
  }

  // Tick mỗi giây: chuyển pha khi hết giờ. Trả về { changed } để gateway broadcast.
  async tick(game: LiveGame): Promise<{ changed: boolean }> {
    // Reset lịch sử mỗi ngày (theo giờ VN)
    const today = this.dayKey();
    if (today !== this.historyDay) {
      this.history = { 'tai-xiu': [], 'bau-cua': [], 'dua-thu': [] };
      this.historyDay = today;
    }
    const r = this.rounds[game];
    if (Date.now() < r.endsAt) return { changed: false };

    if (r.phase === 'betting') {
      r.result = this.roll(game);
      r.phase = 'rolling';
      r.endsAt = Date.now() + ROLL_SEC * 1000;
      return { changed: true };
    }
    if (r.phase === 'rolling') {
      await this.settle(r);
      // lưu lịch sử phiên vừa xong
      this.history[game].unshift({ roundId: r.roundId, result: r.result, at: Date.now() });
      this.history[game] = this.history[game].slice(0, HISTORY_MAX);
      r.phase = 'result';
      r.endsAt = Date.now() + RESULT_SEC * 1000;
      return { changed: true };
    }
    // result -> vòng mới
    this.rounds[game] = this.newRound(game, r.roundId + 1);
    return { changed: true };
  }

  // Chốt: cộng tiền thắng cho từng người
  private async settle(r: Round) {
    for (const [userId, pb] of r.players) {
      let payout = 0;
      const totalBet = pb.bets.reduce((s, b) => s + b.amount, 0);
      if (r.game === 'tai-xiu') {
        const outcome = r.result.outcome; // tai|xiu|house
        for (const b of pb.bets) {
          if (outcome !== 'house' && b.option === outcome) payout += Math.floor(b.amount * 2 * (1 - HOUSE_FEE));
        }
      } else if (r.game === 'bau-cua') {
        const dice: string[] = r.result.dice;
        for (const b of pb.bets) {
          const matches = dice.filter((d) => d === b.option).length;
          if (matches > 0) payout += b.amount + Math.floor(b.amount * matches * (1 - HOUSE_FEE));
        }
      } else {
        // đua thú: đặt 1 ăn 5
        const winner = String(r.result.winner);
        for (const b of pb.bets) {
          if (b.option === winner) payout += Math.floor(b.amount * 5 * (1 - HOUSE_FEE));
        }
      }
      pb.net = payout - totalBet; // đã trừ cược lúc đặt; giờ cộng payout
      if (payout > 0) {
        try { await this.addCoin(userId, payout, `live_${r.game}`, `Thắng ${r.game}`); }
        catch (e) { this.logger.warn(`settle payout lỗi: ${(e as Error).message}`); }
      }
    }
  }

  // Đặt cược (trừ coin ngay). Chỉ trong pha betting.
  async placeBet(userId: string, game: LiveGame, option: string, amount: number) {
    const r = this.rounds[game];
    if (r.phase !== 'betting') throw new BadRequestException('Hết giờ đặt cược, chờ vòng sau');
    if (!this.options(game).includes(option)) throw new BadRequestException('Lựa chọn không hợp lệ');
    amount = Math.floor(amount);
    if (!Number.isFinite(amount) || amount < 100) throw new BadRequestException('Cược tối thiểu 100 coin');
    if (amount > 5000) throw new BadRequestException('Cược tối đa 5000 coin');

    const char = await this.prisma.gameCharacter.findUnique({ where: { userId }, select: { id: true, coinBalance: true } });
    if (!char) throw new BadRequestException('Bạn chưa tạo nhân vật game');
    await this.spendCoin(char.id, char.coinBalance, amount, `live_${game}`, `Cược ${game}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, username: true, avatar: true } });
    const name = user?.displayName || user?.username || 'Người chơi';
    const pb = r.players.get(userId) || { name, avatar: user?.avatar, bets: [] };
    const existing = pb.bets.find((b) => b.option === option);
    if (existing) existing.amount += amount;
    else pb.bets.push({ option, amount });
    r.players.set(userId, pb);
    return { ok: true };
  }

  // State để broadcast / client lấy
  getState(game: LiveGame, userId?: string) {
    const r = this.rounds[game];
    const timeLeft = Math.max(0, Math.ceil((r.endsAt - Date.now()) / 1000));
    // tổng cược mỗi lựa chọn
    const pot: Record<string, number> = {};
    for (const opt of this.options(game)) pot[opt] = 0;
    let totalPot = 0;
    for (const pb of r.players.values()) for (const b of pb.bets) { pot[b.option] = (pot[b.option] || 0) + b.amount; totalPot += b.amount; }
    const players = [...r.players.entries()].map(([uid, pb]) => ({
      name: pb.name,
      avatar: pb.avatar ?? null,
      total: pb.bets.reduce((s, b) => s + b.amount, 0),
      net: pb.net,
      me: uid === userId,
    })).sort((a, b) => b.total - a.total).slice(0, 30);
    const mine = userId ? r.players.get(userId)?.bets ?? [] : [];
    return {
      game, roundId: r.roundId, phase: r.phase, timeLeft,
      result: r.phase === 'betting' ? null : r.result,
      pot, totalPot, players, playerCount: r.players.size, mine,
      myNet: userId ? r.players.get(userId)?.net : undefined,
      history: this.history[game],
    };
  }

  private async spendCoin(characterId: string, balance: number, amount: number, refId: string, note: string) {
    if (balance < amount) throw new BadRequestException(`Không đủ coin (cần ${amount})`);
    const balanceAfter = balance - amount;
    await this.prisma.$transaction([
      this.prisma.gameCharacter.update({ where: { id: characterId }, data: { coinBalance: balanceAfter } }),
      this.prisma.coinTransaction.create({ data: { characterId, type: 'spend_minigame', amount: -amount, balanceBefore: balance, balanceAfter, refId, note } }),
    ]);
  }

  private async addCoin(userId: string, amount: number, refId: string, note: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId }, select: { id: true, coinBalance: true } });
    if (!char) return;
    const balanceAfter = char.coinBalance + amount;
    await this.prisma.$transaction([
      this.prisma.gameCharacter.update({ where: { id: char.id }, data: { coinBalance: balanceAfter } }),
      this.prisma.coinTransaction.create({ data: { characterId: char.id, type: 'earn_minigame', amount, balanceBefore: char.coinBalance, balanceAfter, refId, note } }),
    ]);
  }
}
