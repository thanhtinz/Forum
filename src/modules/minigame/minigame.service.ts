import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinigameType } from '@prisma/client';
import { DiceGames } from './games/dice-games';
import { CardGames } from './games/card-games';
import { CaroGame } from './games/caro-game';
import { JackpotGame } from './games/jackpot-game';

@Injectable()
export class MinigameService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // QUAN TRỌNG: minigame CHỈ DÙNG COIN, không bao giờ gem
  // (gem quy đổi tiền mặt → cấm cờ bạc bằng gem)
  // ──────────────────────────────────────────────

  async listGames() {
    return this.prisma.minigameConfig.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ──────────────────────────────────────────────
  // ĐẶT CƯỢC + KIỂM TRA COIN
  // ──────────────────────────────────────────────
  private async validateAndLockBet(userId: string, betCoin: number, type: MinigameType) {
    const config = await this.prisma.minigameConfig.findUnique({ where: { type } });
    if (!config || !config.isActive) throw new NotFoundException('Game không khả dụng');
    if (betCoin < config.minBet) throw new BadRequestException(`Cược tối thiểu ${config.minBet} coin`);
    if (betCoin > config.maxBet) throw new BadRequestException(`Cược tối đa ${config.maxBet} coin`);

    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');
    if (char.coinBalance < betCoin)
      throw new BadRequestException(`Không đủ Coin. Cần ${betCoin}, có ${char.coinBalance}`);

    return { char, config };
  }

  // ──────────────────────────────────────────────
  // JACKPOT 777 — máy quay slot (3x3, 5 payline)
  // ──────────────────────────────────────────────
  async playJackpot(userId: string, betCoin: number, activeLines = 5) {
    const { char, config } = await this.validateAndLockBet(userId, betCoin, 'JACKPOT_777');

    // Cược nhân theo số payline active
    const totalBet = betCoin * activeLines;
    if (char.coinBalance < totalBet)
      throw new BadRequestException(`Không đủ Coin cho ${activeLines} dòng. Cần ${totalBet}`);

    const result = JackpotGame.spin(activeLines);

    // Tính payout: tổng hệ số × cược mỗi dòng × (1 - phí)
    const payout = Math.floor(betCoin * result.totalMultiplier * (1 - config.houseFee));
    const netCoin = payout - totalBet;

    await this.settleBet(char.id, 'JACKPOT_777', totalBet, netCoin);

    return {
      grid: result.grid,
      paylines: result.paylines,
      multiplier: result.totalMultiplier,
      isJackpot: result.isJackpot,
      betPerLine: betCoin,
      activeLines,
      totalBet,
      payout,
      netCoin,
    };
  }

  // ──────────────────────────────────────────────
  // TÀI XỈU — đặt cược Tài (11-17) hoặc Xỉu (4-10)
  // ──────────────────────────────────────────────
  async playTaiXiu(userId: string, betCoin: number, choice: 'tai' | 'xiu') {
    const { char, config } = await this.validateAndLockBet(userId, betCoin, 'TAI_XIU');

    const result = DiceGames.taiXiu();
    const won = result.outcome === choice;
    const payout = won ? Math.floor(betCoin * (2 - config.houseFee)) : 0;
    const netCoin = won ? payout - betCoin : -betCoin;

    await this.settleBet(char.id, 'TAI_XIU', betCoin, netCoin);

    return {
      dice: result.dice,
      total: result.total,
      outcome: result.outcome,
      choice,
      won,
      payout,
      netCoin,
    };
  }

  // ──────────────────────────────────────────────
  // BẦU CUA — đặt cược vào 1 trong 6 con
  // ──────────────────────────────────────────────
  async playBauCua(userId: string, bets: { symbol: string; amount: number }[]) {
    const totalBet = bets.reduce((s, b) => s + b.amount, 0);
    const { char, config } = await this.validateAndLockBet(userId, totalBet, 'BAU_CUA');

    const result = DiceGames.bauCua();
    let totalPayout = 0;
    for (const bet of bets) {
      const matches = result.dice.filter((d) => d === bet.symbol).length;
      if (matches > 0) {
        // Mỗi con khớp trả 1x tiền cược + hoàn tiền gốc
        totalPayout += bet.amount + Math.floor(bet.amount * matches * (1 - config.houseFee));
      }
    }
    const netCoin = totalPayout - totalBet;
    await this.settleBet(char.id, 'BAU_CUA', totalBet, netCoin);

    return { dice: result.dice, bets, totalPayout, netCoin };
  }

  // ──────────────────────────────────────────────
  // LUCKY WHEEL — vòng quay
  // ──────────────────────────────────────────────
  async playLuckyWheel(userId: string, betCoin: number) {
    const { char, config } = await this.validateAndLockBet(userId, betCoin, 'LUCKY_WHEEL');

    // Các ô: x0, x0.5, x1, x2, x3, x5, x10 (trọng số khác nhau)
    const segments = [
      { mul: 0, weight: 30 }, { mul: 0.5, weight: 25 }, { mul: 1, weight: 20 },
      { mul: 2, weight: 12 }, { mul: 3, weight: 8 }, { mul: 5, weight: 4 }, { mul: 10, weight: 1 },
    ];
    const totalWeight = segments.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * totalWeight;
    let landed = segments[0];
    for (const seg of segments) {
      if (r < seg.weight) { landed = seg; break; }
      r -= seg.weight;
    }

    const payout = Math.floor(betCoin * landed.mul * (1 - config.houseFee));
    const netCoin = payout - betCoin;
    await this.settleBet(char.id, 'LUCKY_WHEEL', betCoin, netCoin);

    return { multiplier: landed.mul, payout, netCoin };
  }

  // ──────────────────────────────────────────────
  // COIN FLIP — tung đồng xu
  // ──────────────────────────────────────────────
  async playCoinFlip(userId: string, betCoin: number, choice: 'heads' | 'tails') {
    const { char, config } = await this.validateAndLockBet(userId, betCoin, 'COIN_FLIP');
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = result === choice;
    const payout = won ? Math.floor(betCoin * (2 - config.houseFee)) : 0;
    const netCoin = won ? payout - betCoin : -betCoin;
    await this.settleBet(char.id, 'COIN_FLIP', betCoin, netCoin);
    return { result, choice, won, payout, netCoin };
  }

  // ──────────────────────────────────────────────
  // BLACKJACK — chơi với nhà cái
  // ──────────────────────────────────────────────
  async playBlackjack(userId: string, betCoin: number, action?: 'start' | 'hit' | 'stand', state?: any) {
    const { char, config } = await this.validateAndLockBet(userId, betCoin, 'BLACKJACK');

    if (action === 'start' || !action) {
      const game = CardGames.blackjackStart();
      return { state: game, finished: false };
    }

    // hit/stand cần state truyền vào
    const result = CardGames.blackjackAction(state, action!);
    if (result.finished) {
      const payout = result.playerWon ? Math.floor(betCoin * (2 - config.houseFee)) :
        result.push ? betCoin : 0;
      const netCoin = result.playerWon ? payout - betCoin : result.push ? 0 : -betCoin;
      await this.settleBet(char.id, 'BLACKJACK', betCoin, netCoin);
      return { ...result, payout, netCoin };
    }
    return result;
  }

  // ──────────────────────────────────────────────
  // SETTLE — cập nhật coin + log (transaction)
  // ──────────────────────────────────────────────
  private async settleBet(characterId: string, type: MinigameType, betCoin: number, netCoin: number) {
    await this.prisma.$transaction(async (tx) => {
      const char = await tx.gameCharacter.findUnique({
        where: { id: characterId },
        select: { coinBalance: true },
      });
      if (!char) throw new NotFoundException();

      const balanceAfter = char.coinBalance + netCoin;
      if (balanceAfter < 0) throw new BadRequestException('Lỗi số dư');

      await tx.gameCharacter.update({
        where: { id: characterId },
        data: { coinBalance: balanceAfter },
      });

      await tx.coinTransaction.create({
        data: {
          characterId, type: netCoin >= 0 ? 'win_minigame' : 'lose_minigame',
          amount: netCoin,
          balanceBefore: char.coinBalance, balanceAfter,
          refType: 'minigame', note: `${type}`,
        },
      });

      await tx.gambleLog.create({
        data: { characterId, type, betCoin, resultCoin: netCoin },
      });
    });
  }

  // ──────────────────────────────────────────────
  // CARO — PvP cờ caro (multiplayer room)
  // ──────────────────────────────────────────────
  async createCaroRoom(userId: string, betCoin: number) {
    const { char } = await this.validateAndLockBet(userId, betCoin, 'CARO');
    const config = await this.prisma.minigameConfig.findUnique({ where: { type: 'CARO' } });

    const room = await this.prisma.minigameRoom.create({
      data: {
        configId: config!.id,
        type: 'CARO',
        betAmount: betCoin,
        hostId: char.id,
        maxPlayers: 2,
        potCoin: 0,
        state: CaroGame.initState(),
      },
    });

    return room;
  }

  async caroMove(roomId: string, userId: string, x: number, y: number) {
    const room = await this.prisma.minigameRoom.findUnique({
      where: { id: roomId },
      include: { players: true },
    });
    if (!room) throw new NotFoundException('Phòng không tồn tại');

    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    const player = room.players.find((p) => p.characterId === char?.id);
    if (!player) throw new ForbiddenException('Bạn không ở trong phòng này');

    const newState = CaroGame.move(room.state as any, player.seatIndex, x, y);

    await this.prisma.minigameRoom.update({
      where: { id: roomId },
      data: { state: newState as any, status: newState.winner != null ? 'FINISHED' : 'PLAYING' },
    });

    return newState;
  }

  // ──────────────────────────────────────────────
  // THỐNG KÊ CƯỢC của user
  // ──────────────────────────────────────────────
  async getMyGambleStats(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Chưa có nhân vật');

    const logs = await this.prisma.gambleLog.findMany({
      where: { characterId: char.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const totalBet = logs.reduce((s, l) => s + l.betCoin, 0);
    const totalNet = logs.reduce((s, l) => s + l.resultCoin, 0);

    return { logs, totalBet, totalNet, gamesPlayed: logs.length };
  }
}
