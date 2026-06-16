import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MinigameType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CardGames, Card } from './games/card-games';
import { TienLen, Combo } from './games/tien-len';

export interface TLRoomState {
  seats: string[];      // characterId theo ghế
  hands: Card[][];      // bài theo ghế
  turn: number;
  pile: Card[];
  pileCombo: Combo | null;
  leader: number;
  passed: boolean[];
  finished: boolean;
  winner: number;       // ghế thắng
}

const MAX_BY_TYPE: Partial<Record<MinigameType, number>> = {
  TIEN_LEN: 4,
  POKER: 6,
};

// Phòng chơi nhiều người (PvP) — hiện hỗ trợ Tiến Lên. Cược gom vào pot, người thắng ăn pot.
@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Danh sách phòng đang chờ ──
  async listRooms(type: MinigameType) {
    const rooms = await this.prisma.minigameRoom.findMany({
      where: { type, status: 'WAITING' },
      orderBy: { createdAt: 'desc' },
      include: { players: { where: { hasLeft: false } } },
    });
    return rooms.map((r) => ({
      id: r.id,
      type: r.type,
      betAmount: r.betAmount,
      players: r.players.length,
      maxPlayers: r.maxPlayers,
      potCoin: r.potCoin,
    }));
  }

  // ── Tạo phòng ──
  async createRoom(userId: string, type: MinigameType, betCoin: number) {
    const char = await this.getChar(userId);
    const config = await this.prisma.minigameConfig.findUnique({ where: { type } });
    if (!config) throw new NotFoundException('Game không tồn tại');
    if (betCoin < config.minBet || betCoin > config.maxBet) {
      throw new BadRequestException(`Cược phải từ ${config.minBet} đến ${config.maxBet}`);
    }
    const maxPlayers = MAX_BY_TYPE[type] ?? 4;

    return this.prisma.$transaction(async (tx) => {
      await this.spend(tx, char.id, betCoin, 'room_bet', `Cược phòng ${type}`);
      const room = await tx.minigameRoom.create({
        data: {
          configId: config.id, type, betAmount: betCoin, hostId: char.id,
          maxPlayers, potCoin: betCoin, status: 'WAITING',
        },
      });
      await tx.minigamePlayer.create({
        data: { roomId: room.id, characterId: char.id, seatIndex: 0, betCoin },
      });
      return { roomId: room.id, seat: 0, maxPlayers };
    });
  }

  // ── Vào phòng ──
  async joinRoom(userId: string, roomId: string) {
    const char = await this.getChar(userId);
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.minigameRoom.findUnique({
        where: { id: roomId },
        include: { players: { where: { hasLeft: false } } },
      });
      if (!room) throw new NotFoundException('Phòng không tồn tại');
      if (room.status !== 'WAITING') throw new BadRequestException('Phòng đã bắt đầu');
      if (room.players.length >= room.maxPlayers) throw new BadRequestException('Phòng đã đầy');
      if (room.players.some((p) => p.characterId === char.id)) {
        throw new BadRequestException('Bạn đã ở trong phòng');
      }
      await this.spend(tx, char.id, room.betAmount, 'room_bet', `Cược phòng ${room.type}`);
      const seat = room.players.length;
      await tx.minigamePlayer.create({
        data: { roomId: room.id, characterId: char.id, seatIndex: seat, betCoin: room.betAmount },
      });
      await tx.minigameRoom.update({
        where: { id: room.id },
        data: { potCoin: { increment: room.betAmount } },
      });
      return { roomId: room.id, seat };
    });
  }

  // ── Rời phòng (chỉ khi đang chờ; hoàn cược) ──
  async leaveRoom(userId: string, roomId: string) {
    const char = await this.getChar(userId);
    return this.prisma.$transaction(async (tx) => {
      const room = await tx.minigameRoom.findUnique({
        where: { id: roomId },
        include: { players: { where: { hasLeft: false } } },
      });
      if (!room) throw new NotFoundException('Phòng không tồn tại');
      const me = room.players.find((p) => p.characterId === char.id);
      if (!me) throw new BadRequestException('Bạn không ở trong phòng');
      if (room.status === 'PLAYING') throw new BadRequestException('Ván đang chơi, không thể rời');

      await tx.minigamePlayer.update({ where: { id: me.id }, data: { hasLeft: true } });
      await this.add(tx, char.id, room.betAmount, 'room_refund', 'Hoàn cược rời phòng');
      await tx.minigameRoom.update({ where: { id: room.id }, data: { potCoin: { decrement: room.betAmount } } });

      const remaining = room.players.filter((p) => p.characterId !== char.id);
      if (remaining.length === 0) {
        await tx.minigameRoom.delete({ where: { id: room.id } });
        return { left: true, roomClosed: true };
      }
      return { left: true, roomClosed: false };
    });
  }

  // ── Sẵn sàng → đủ ≥2 người & tất cả ready thì chia bài ──
  async ready(userId: string, roomId: string) {
    const char = await this.getChar(userId);
    const room = await this.prisma.minigameRoom.findUnique({
      where: { id: roomId },
      include: { players: { where: { hasLeft: false }, orderBy: { seatIndex: 'asc' } } },
    });
    if (!room) throw new NotFoundException('Phòng không tồn tại');
    const me = room.players.find((p) => p.characterId === char.id);
    if (!me) throw new BadRequestException('Bạn không ở trong phòng');
    await this.prisma.minigamePlayer.update({ where: { id: me.id }, data: { isReady: true } });

    const players = room.players.map((p) => (p.id === me.id ? { ...p, isReady: true } : p));
    const allReady = players.length >= 2 && players.every((p) => p.isReady);
    if (allReady && room.status === 'WAITING' && room.type === 'TIEN_LEN') {
      await this.startTienLen(room.id, players.map((p) => p.characterId));
      return { ready: true, started: true };
    }
    return { ready: true, started: false };
  }

  private async startTienLen(roomId: string, seats: string[]) {
    const n = seats.length;
    const hands = CardGames.tienLenDeal(n).map((h) => TienLen.sortHand(h));
    let leader = 0;
    for (let s = 0; s < n; s++) {
      if (hands[s].some((c) => c.rank === '3' && c.suit === 'spades')) { leader = s; break; }
    }
    const state: TLRoomState = {
      seats, hands, turn: leader, pile: [], pileCombo: null, leader,
      passed: new Array(n).fill(false), finished: false, winner: -1,
    };
    await this.prisma.minigameRoom.update({
      where: { id: roomId },
      data: { status: 'PLAYING', state: state as unknown as Prisma.InputJsonValue },
    });
  }

  // ── Đánh bài / bỏ lượt ──
  async play(userId: string, roomId: string, action: 'play' | 'pass', cards?: Card[]) {
    const char = await this.getChar(userId);
    const room = await this.prisma.minigameRoom.findUnique({ where: { id: roomId } });
    if (!room || room.status !== 'PLAYING' || !room.state) {
      throw new BadRequestException('Phòng chưa vào ván');
    }
    const s = room.state as unknown as TLRoomState;
    const seat = s.seats.indexOf(char.id);
    if (seat < 0) throw new ForbiddenException('Bạn không ở trong phòng');
    if (s.turn !== seat) throw new BadRequestException('Chưa tới lượt bạn');
    const n = s.seats.length;

    if (action === 'pass') {
      if (!s.pileCombo) throw new BadRequestException('Đang đánh tự do, không được bỏ lượt');
      s.passed[seat] = true;
      this.advance(s, n);
    } else {
      if (!cards || cards.length === 0) throw new BadRequestException('Chưa chọn bài');
      const combo = TienLen.parse(cards);
      if (combo.type === 'invalid') throw new BadRequestException('Bộ bài không hợp lệ');
      if (!TienLen.canBeat(s.pileCombo, combo)) throw new BadRequestException('Bài không chặt được');
      const keys = new Set(s.hands[seat].map((c) => `${c.rank}-${c.suit}`));
      if (!cards.every((c) => keys.has(`${c.rank}-${c.suit}`))) {
        throw new BadRequestException('Bạn không có những lá này');
      }
      s.hands[seat] = TienLen.removeCards(s.hands[seat], cards);
      s.pile = combo.cards;
      s.pileCombo = combo;
      s.leader = seat;
      s.passed = new Array(n).fill(false);
      if (s.hands[seat].length === 0) { s.finished = true; s.winner = seat; }
      else this.advance(s, n);
    }

    if (s.finished) {
      await this.settleRoom(room.id, s.seats[s.winner]);
    } else {
      await this.prisma.minigameRoom.update({
        where: { id: room.id },
        data: { state: s as unknown as Prisma.InputJsonValue },
      });
    }
    return { state: s, finished: s.finished, winnerSeat: s.finished ? s.winner : undefined };
  }

  // Người chơi xem ván: chỉ thấy bài mình + số lá người khác
  async view(userId: string, roomId: string) {
    const char = await this.getChar(userId);
    const room = await this.prisma.minigameRoom.findUnique({
      where: { id: roomId },
      include: { players: { where: { hasLeft: false } } },
    });
    if (!room) throw new NotFoundException('Phòng không tồn tại');
    if (!room.state) {
      return { status: room.status, players: room.players.length, maxPlayers: room.maxPlayers, betAmount: room.betAmount };
    }
    return this.viewState(room.state as unknown as TLRoomState, char.id, room.potCoin);
  }

  // Dùng bởi gateway để build view cho từng người
  viewState(s: TLRoomState, charId: string, potCoin: number) {
    const seat = s.seats.indexOf(charId);
    return {
      status: 'PLAYING',
      mySeat: seat,
      myHand: seat >= 0 ? s.hands[seat] : [],
      turn: s.turn,
      pile: s.pile,
      counts: s.hands.map((h) => h.length),
      leader: s.leader,
      passed: s.passed,
      finished: s.finished,
      winnerSeat: s.finished ? s.winner : undefined,
      potCoin,
    };
  }

  async getSeats(roomId: string): Promise<string[]> {
    const room = await this.prisma.minigameRoom.findUnique({ where: { id: roomId } });
    if (!room?.state) return [];
    return (room.state as unknown as TLRoomState).seats;
  }

  // ── chuyển lượt (N người, bỏ qua người đã pass; quay về leader = đánh tự do) ──
  private advance(s: TLRoomState, n: number) {
    const others = s.seats.map((_, i) => i).filter((i) => i !== s.leader);
    if (others.every((i) => s.passed[i])) {
      s.pile = [];
      s.pileCombo = null;
      s.passed = new Array(n).fill(false);
      s.turn = s.leader;
      return;
    }
    let next = (s.turn + 1) % n;
    let guard = 0;
    while (s.passed[next] && guard++ < n * 2) next = (next + 1) % n;
    s.turn = next;
  }

  private async settleRoom(roomId: string, winnerCharId: string) {
    await this.prisma.$transaction(async (tx) => {
      const room = await tx.minigameRoom.findUnique({ where: { id: roomId }, include: { config: true } });
      if (!room) return;
      const fee = room.config.houseFee;
      const prize = Math.floor(room.potCoin * (1 - fee));
      await this.add(tx, winnerCharId, prize, 'room_win', `Thắng phòng ${room.type}`);
      await tx.minigameResult.create({
        data: { roomId: room.id, characterId: winnerCharId, isWinner: true, coinBet: room.betAmount, coinWon: prize, details: {} },
      });
      await tx.minigameRoom.update({
        where: { id: roomId },
        data: { status: 'FINISHED', finishedAt: new Date(), state: room.state ?? Prisma.JsonNull },
      });
    });
  }

  // ── helpers ──
  private async getChar(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({ where: { userId } });
    if (!char) throw new NotFoundException('Bạn chưa tạo nhân vật game');
    return char;
  }

  private async spend(tx: Prisma.TransactionClient, characterId: string, amount: number, refId: string, note: string) {
    const c = await tx.gameCharacter.findUnique({ where: { id: characterId }, select: { coinBalance: true } });
    if (!c) throw new NotFoundException();
    if (c.coinBalance < amount) throw new BadRequestException('Không đủ coin');
    const after = c.coinBalance - amount;
    await tx.gameCharacter.update({ where: { id: characterId }, data: { coinBalance: after } });
    await tx.coinTransaction.create({ data: { characterId, type: 'spend_room', amount: -amount, balanceBefore: c.coinBalance, balanceAfter: after, refId, note } });
  }

  private async add(tx: Prisma.TransactionClient, characterId: string, amount: number, refId: string, note: string) {
    const c = await tx.gameCharacter.findUnique({ where: { id: characterId }, select: { coinBalance: true } });
    if (!c) throw new NotFoundException();
    const after = c.coinBalance + amount;
    await tx.gameCharacter.update({ where: { id: characterId }, data: { coinBalance: after } });
    await tx.coinTransaction.create({ data: { characterId, type: 'earn_room', amount, balanceBefore: c.coinBalance, balanceAfter: after, refId, note } });
  }
}
