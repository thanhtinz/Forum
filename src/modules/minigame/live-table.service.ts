import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DiceGames } from './games/dice-games';

// Phòng chung theo vòng (nhiều người) cho Tài Xỉu & Bầu Cua.
// Mỗi game 1 phòng duy nhất, vòng chạy liên tục: đặt cược -> xóc -> kết quả -> vòng mới.
export type LiveGame = 'tai-xiu' | 'bau-cua';
type Phase = 'betting' | 'rolling' | 'result';
const HOUSE_FEE = 0.05;
const BET_SEC = 25;
const ROLL_SEC = 4;
const RESULT_SEC = 6;
const TAIXIU_OPTS = ['tai', 'xiu'];
const BAUCUA_OPTS = ['bau', 'cua', 'tom', 'ca', 'ga', 'nai'];

interface PlayerBets {
  name: string;
  avatar?: string | null;
  bets: { option: string; amount: number }[];
  net?: number;        // lãi/lỗ sau khi chốt vòng
}
interface Round {
  game: LiveGame;
  roundId: number;
  phase: Phase;
  endsAt: number;
  result: any | null;          // { dice, total, outcome } | { dice }
  players: Map<string, PlayerBets>; // userId -> bets
}

@Injectable()
export class LiveTableService {
  private readonly logger = new Logger(LiveTableService.name);
  private rounds: Record<LiveGame, Round> = {
    'tai-xiu': this.newRound('tai-xiu', 1),
    'bau-cua': this.newRound('bau-cua', 1),
  };

  constructor(private readonly prisma: PrismaService) {}

  private newRound(game: LiveGame, roundId: number): Round {
    return { game, roundId, phase: 'betting', endsAt: Date.now() + BET_SEC * 1000, result: null, players: new Map() };
  }

  options(game: LiveGame) { return game === 'tai-xiu' ? TAIXIU_OPTS : BAUCUA_OPTS; }

  // Tick mỗi giây: chuyển pha khi hết giờ. Trả về { changed, settled } để gateway broadcast.
  async tick(game: LiveGame): Promise<{ changed: boolean }> {
    const r = this.rounds[game];
    if (Date.now() < r.endsAt) return { changed: false };

    if (r.phase === 'betting') {
      // Xóc kết quả
      r.result = game === 'tai-xiu' ? DiceGames.taiXiu() : DiceGames.bauCua();
      r.phase = 'rolling';
      r.endsAt = Date.now() + ROLL_SEC * 1000;
      return { changed: true };
    }
    if (r.phase === 'rolling') {
      await this.settle(r);
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
      } else {
        const dice: string[] = r.result.dice;
        for (const b of pb.bets) {
          const matches = dice.filter((d) => d === b.option).length;
          if (matches > 0) payout += b.amount + Math.floor(b.amount * matches * (1 - HOUSE_FEE));
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
