import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LiveTableService, LiveGame } from './live-table.service';

// Phòng chung theo vòng (Tài Xỉu / Bầu Cua) — nhiều người cùng cược 1 ván.
@WebSocketGateway({ namespace: '/live-table', cors: { origin: '*' } })
export class LiveTableGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(LiveTableGateway.name);
  private socketUser = new Map<string, string>();      // socketId -> userId
  private socketGame = new Map<string, LiveGame>();     // socketId -> game đang xem

  constructor(
    private readonly live: LiveTableService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  afterInit() {
    // Vòng lặp 1s: chuyển pha + bắn state cho từng người xem
    setInterval(() => { this.loop().catch(() => {}); }, 1000);
  }

  private async loop() {
    for (const g of ['tai-xiu', 'bau-cua'] as LiveGame[]) {
      try { await this.live.tick(g); } catch (e) { this.logger.warn(`tick ${g}: ${(e as Error).message}`); }
    }
    for (const [sid, game] of this.socketGame) {
      const uid = this.socketUser.get(sid);
      this.server.to(sid).emit('live', this.live.getState(game, uid));
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return client.disconnect();
      const payload = await this.jwt.verifyAsync(token, { secret: this.config.get('JWT_ACCESS_SECRET') });
      this.socketUser.set(client.id, payload.sub);
    } catch { client.disconnect(); }
  }

  handleDisconnect(client: Socket) {
    this.socketUser.delete(client.id);
    this.socketGame.delete(client.id);
  }

  @SubscribeMessage('joinLive')
  join(@ConnectedSocket() client: Socket, @MessageBody() data: { game: LiveGame }) {
    const uid = this.socketUser.get(client.id);
    if (!uid) { client.emit('error', { message: 'Chưa xác thực' }); return; }
    if (data.game !== 'tai-xiu' && data.game !== 'bau-cua') return;
    this.socketGame.set(client.id, data.game);
    return this.live.getState(data.game, uid);
  }

  @SubscribeMessage('bet')
  async bet(@ConnectedSocket() client: Socket, @MessageBody() data: { game: LiveGame; option: string; amount: number }) {
    const uid = this.socketUser.get(client.id);
    if (!uid) { client.emit('error', { message: 'Chưa xác thực' }); return; }
    try {
      await this.live.placeBet(uid, data.game, data.option, Number(data.amount));
      client.emit('live', this.live.getState(data.game, uid));
      return { ok: true };
    } catch (e: any) { client.emit('error', { message: e.message }); return { ok: false }; }
  }
}
