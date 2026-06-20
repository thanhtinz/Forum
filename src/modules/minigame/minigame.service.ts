import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MinigameType, Prisma } from '@prisma/client';
import { DiceGames } from './games/dice-games';
import { CardGames } from './games/card-games';
import { CaroGame } from './games/caro-game';
import { JackpotGame } from './games/jackpot-game';
import { RaceGame } from './games/race-game';
import { TienLen, TLState } from './games/tien-len';

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
    const maxBet = Math.min(config.maxBet, 5000); // giới hạn cứng 5000 coin/ván
    if (betCoin > maxBet) throw new BadRequestException(`Cược tối đa ${maxBet} coin`);

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

    const lines = Math.max(1, Math.min(5, activeLines));
    const result = JackpotGame.spin(lines);

    // betCoin = TỔNG cược, chia đều cho các dòng. payout = cược/dòng × tổng hệ số × (1 - phí)
    const perLine = betCoin / lines;
    const payout = Math.floor(perLine * result.totalMultiplier * (1 - config.houseFee));
    const netCoin = payout - betCoin; // thua tối đa = đúng số đã cược

    await this.settleBet(char.id, 'JACKPOT_777', betCoin, netCoin);

    return {
      grid: result.grid,
      paylines: result.paylines,
      multiplier: result.totalMultiplier,
      isJackpot: result.isJackpot,
      betPerLine: Math.floor(perLine),
      activeLines: lines,
      totalBet: betCoin,
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
  // ĐUA THÚ — đặt 1 trong 7 con, "đặt 1 ăn 5"
  // ──────────────────────────────────────────────
  async playDuaThu(userId: string, betCoin: number, choice: number) {
    if (!Number.isInteger(choice) || choice < 1 || choice > RaceGame.LANE_COUNT) {
      throw new BadRequestException(`Thú đặt cược không hợp lệ (1-${RaceGame.LANE_COUNT})`);
    }
    const { char, config } = await this.validateAndLockBet(userId, betCoin, 'DUA_THU');

    const result = RaceGame.simulate();
    const won = result.winner === choice;
    const payout = won
      ? Math.floor(betCoin * RaceGame.PAYOUT_MULTIPLIER * (1 - config.houseFee))
      : 0;
    const netCoin = won ? payout - betCoin : -betCoin;

    await this.settleBet(char.id, 'DUA_THU', betCoin, netCoin);

    return {
      animals: RaceGame.ANIMALS,
      winner: result.winner,
      results: result.results,
      durationMs: result.durationMs,
      frames: result.frames,
      choice,
      won,
      payout,
      netCoin,
    };
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
  // VIDEO POKER (Jacks or Better) — cược, chia 5 lá, đổi bài, trả theo hạng
  // ──────────────────────────────────────────────
  async playPoker(
    userId: string,
    betCoin: number,
    action?: 'start' | 'draw',
    state?: { hand: any[]; deck: any[] },
    hold?: boolean[],
  ) {
    const { char, config } = await this.validateAndLockBet(userId, betCoin, 'POKER');

    if (action === 'start' || !action) {
      const game = CardGames.videoPokerDeal();
      return { state: game, finished: false };
    }

    if (!state) throw new BadRequestException('Thiếu state ván bài');
    const holdMask = (hold ?? [false, false, false, false, false]).slice(0, 5);
    const finalHand = CardGames.videoPokerDraw(state.hand, state.deck, holdMask);
    const ev = CardGames.evaluatePokerHand(finalHand);
    const mult = CardGames.POKER_PAYOUT[ev.rank] ?? 0;
    const payout = mult > 0 ? Math.floor(betCoin * mult * (1 - config.houseFee)) : 0;
    const netCoin = payout - betCoin;
    await this.settleBet(char.id, 'POKER', betCoin, netCoin);

    return { finished: true, hand: finalHand, handName: ev.name, multiplier: mult, payout, netCoin };
  }

  // ──────────────────────────────────────────────
  // TIẾN LÊN MIỀN NAM — 1 người vs 3 bot
  // ──────────────────────────────────────────────
  async playTienLen(
    userId: string,
    betCoin: number,
    action?: 'start' | 'play' | 'pass',
    state?: TLState,
    cards?: any[],
  ) {
    const { char, config } = await this.validateAndLockBet(userId, betCoin, 'TIEN_LEN');

    if (action === 'start' || !action) {
      const s = TienLen.start();
      // bot đi trước nếu người không phải leader
      this.runBots(s);
      return { state: this.publicState(s), finished: false };
    }

    if (!state) throw new BadRequestException('Thiếu state ván bài');
    const s: TLState = state;
    if (s.finished) throw new BadRequestException('Ván đã kết thúc');
    if (s.turn !== 0) throw new BadRequestException('Chưa tới lượt bạn');

    if (action === 'pass') {
      if (!s.pileCombo) throw new BadRequestException('Bạn đang được đánh tự do, không thể bỏ lượt');
      s.passed[0] = true;
      this.advanceTurn(s);
    } else {
      // play: validate combo của người chơi
      if (!cards || cards.length === 0) throw new BadRequestException('Chưa chọn bài');
      const combo = TienLen.parse(cards);
      if (combo.type === 'invalid') throw new BadRequestException('Bộ bài không hợp lệ');
      if (!TienLen.canBeat(s.pileCombo, combo)) throw new BadRequestException('Bài không chặt được bộ trên bàn');
      // các lá phải có trong tay
      const handKeys = new Set(s.hands[0].map((c: any) => `${c.rank}-${c.suit}`));
      if (!cards.every((c) => handKeys.has(`${c.rank}-${c.suit}`))) {
        throw new BadRequestException('Bạn không có những lá này');
      }
      s.hands[0] = TienLen.removeCards(s.hands[0], cards);
      s.pile = combo.cards;
      s.pileCombo = combo;
      s.leader = 0;
      s.passed = [false, false, false, false];
      if (s.hands[0].length === 0) {
        s.finished = true;
        s.winner = 0;
      } else {
        this.advanceTurn(s);
      }
    }

    if (!s.finished) this.runBots(s);

    let payout = 0;
    let netCoin = -betCoin;
    if (s.finished) {
      if (s.winner === 0) {
        payout = Math.floor(betCoin * 3 * (1 - config.houseFee));
        netCoin = payout - betCoin;
      }
      await this.settleBet(char.id, 'TIEN_LEN', betCoin, netCoin);
    }

    return {
      state: this.publicState(s),
      finished: s.finished,
      winner: s.finished ? s.winner : undefined,
      payout: s.finished ? payout : undefined,
      netCoin: s.finished ? netCoin : undefined,
    };
  }

  // Cho bot đánh đến khi tới lượt người chơi hoặc ván kết thúc
  private runBots(s: TLState) {
    let guard = 0;
    while (!s.finished && s.turn !== 0 && guard++ < 200) {
      const p = s.turn;
      const move = TienLen.botMove(s.hands[p], s.pileCombo);
      if (move && move.length) {
        const combo = TienLen.parse(move);
        s.hands[p] = TienLen.removeCards(s.hands[p], move);
        s.pile = combo.cards;
        s.pileCombo = combo;
        s.leader = p;
        s.passed = [false, false, false, false];
        if (s.hands[p].length === 0) { s.finished = true; s.winner = p; break; }
        this.advanceTurn(s);
      } else {
        s.passed[p] = true;
        this.advanceTurn(s);
      }
    }
  }

  // chuyển lượt; nếu 3 người đã pass quanh leader -> leader đánh tự do
  private advanceTurn(s: TLState) {
    let next = (s.turn + 1) % 4;
    let guard = 0;
    while (s.passed[next] && next !== s.leader && guard++ < 8) {
      next = (next + 1) % 4;
    }
    // nếu vòng về leader (mọi người khác đã pass) -> reset bàn, leader đánh tự do
    const others = [0, 1, 2, 3].filter((i) => i !== s.leader);
    if (others.every((i) => s.passed[i])) {
      s.pile = [];
      s.pileCombo = null;
      s.passed = [false, false, false, false];
      s.turn = s.leader;
    } else {
      s.turn = next;
    }
  }

  // Trả full state để client gửi lại lượt sau (server tin state như blackjack).
  // Kèm botCounts cho UI hiển thị số lá còn lại của bot.
  private publicState(s: TLState) {
    return {
      ...s,
      botCounts: [s.hands[1].length, s.hands[2].length, s.hands[3].length],
    };
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
          refId: 'minigame', note: `${type}`,
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
        state: CaroGame.initState() as unknown as Prisma.InputJsonValue,
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
