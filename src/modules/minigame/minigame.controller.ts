import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { MinigameType } from '@prisma/client';
import { MinigameService } from './minigame.service';
import { RoomService } from './room.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('minigame')
@UseGuards(JwtAuthGuard)
export class MinigameController {
  constructor(
    private readonly minigame: MinigameService,
    private readonly rooms: RoomService,
  ) {}

  // ── Phòng PvP (chơi với người thật) — fallback REST cho gateway WS ──
  @Get('rooms')
  listRooms(@Query('type') type: MinigameType) {
    return this.rooms.listRooms(type);
  }

  @Post('rooms/create')
  createRoom(@CurrentUser('id') userId: string, @Body() b: { type: MinigameType; betCoin: number }) {
    return this.rooms.createRoom(userId, b.type, Number(b.betCoin));
  }

  @Post('rooms/:id/join')
  joinRoom(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.rooms.joinRoom(userId, id);
  }

  @Post('rooms/:id/leave')
  leaveRoom(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.rooms.leaveRoom(userId, id);
  }

  @Post('rooms/:id/ready')
  readyRoom(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.rooms.ready(userId, id);
  }

  @Get('rooms/:id')
  viewRoom(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.rooms.view(userId, id);
  }

  @Post('rooms/:id/play')
  playRoom(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() b: { action: 'play' | 'pass'; cards?: any[] },
  ) {
    return this.rooms.play(userId, id, b.action, b.cards);
  }

  @Get('games')
  listGames() {
    return this.minigame.listGames();
  }

  @Get('stats')
  getStats(@CurrentUser('id') userId: string) {
    return this.minigame.getMyGambleStats(userId);
  }

  // ── Jackpot 777 ──
  @Post('jackpot')
  playJackpot(
    @CurrentUser('id') userId: string,
    @Body() body: { betCoin: number; activeLines?: number },
  ) {
    return this.minigame.playJackpot(userId, body.betCoin, body.activeLines);
  }

  // ── Tài Xỉu ──
  @Post('tai-xiu')
  playTaiXiu(
    @CurrentUser('id') userId: string,
    @Body() body: { betCoin: number; choice: 'tai' | 'xiu' },
  ) {
    return this.minigame.playTaiXiu(userId, body.betCoin, body.choice);
  }

  // ── Bầu Cua ──
  @Post('bau-cua')
  playBauCua(
    @CurrentUser('id') userId: string,
    @Body('bets') bets: { symbol: string; amount: number }[],
  ) {
    return this.minigame.playBauCua(userId, bets);
  }

  // ── Lucky Wheel ──
  @Post('lucky-wheel')
  playLuckyWheel(@CurrentUser('id') userId: string, @Body('betCoin') betCoin: number) {
    return this.minigame.playLuckyWheel(userId, betCoin);
  }

  // ── Đua Thú ──
  @Post('dua-thu')
  playDuaThu(
    @CurrentUser('id') userId: string,
    @Body() body: { betCoin: number; choice: number },
  ) {
    return this.minigame.playDuaThu(userId, body.betCoin, body.choice);
  }

  // ── Coin Flip ──
  @Post('coin-flip')
  playCoinFlip(
    @CurrentUser('id') userId: string,
    @Body() body: { betCoin: number; choice: 'heads' | 'tails' },
  ) {
    return this.minigame.playCoinFlip(userId, body.betCoin, body.choice);
  }

  // ── Blackjack ──
  @Post('blackjack')
  playBlackjack(
    @CurrentUser('id') userId: string,
    @Body() body: { betCoin: number; action?: 'start' | 'hit' | 'stand'; state?: any },
  ) {
    return this.minigame.playBlackjack(userId, body.betCoin, body.action, body.state);
  }

  // ── Video Poker ──
  @Post('poker')
  playPoker(
    @CurrentUser('id') userId: string,
    @Body() body: { betCoin: number; action?: 'start' | 'draw'; state?: any; hold?: boolean[] },
  ) {
    return this.minigame.playPoker(userId, body.betCoin, body.action, body.state, body.hold);
  }

  // ── Tiến Lên (vs 3 bot) ──
  @Post('tien-len')
  playTienLen(
    @CurrentUser('id') userId: string,
    @Body() body: { betCoin: number; action?: 'start' | 'play' | 'pass'; state?: any; cards?: any[] },
  ) {
    return this.minigame.playTienLen(userId, body.betCoin, body.action, body.state, body.cards);
  }

  // ── Caro (PvP) ──
  @Post('caro/room')
  createCaroRoom(@CurrentUser('id') userId: string, @Body('betCoin') betCoin: number) {
    return this.minigame.createCaroRoom(userId, betCoin);
  }

  @Post('caro/:roomId/move')
  caroMove(
    @CurrentUser('id') userId: string,
    @Param('roomId') roomId: string,
    @Body() body: { x: number; y: number },
  ) {
    return this.minigame.caroMove(roomId, userId, body.x, body.y);
  }
}
