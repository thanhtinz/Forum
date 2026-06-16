import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MinigameType } from '@prisma/client';
import { RoomService } from './room.service';
import { Card } from './games/card-games';

// Realtime phòng minigame (PvP). Mỗi người nhận state riêng (chỉ thấy bài mình).
@WebSocketGateway({ namespace: '/minigame', cors: { origin: '*' } })
export class MinigameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(MinigameGateway.name);
  private socketUser = new Map<string, string>();      // socketId -> userId
  private userSocket = new Map<string, string>();      // userId -> socketId

  constructor(
    private readonly rooms: RoomService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return client.disconnect();
      const payload = await this.jwt.verifyAsync(token, { secret: this.config.get('JWT_ACCESS_SECRET') });
      this.socketUser.set(client.id, payload.sub);
      this.userSocket.set(payload.sub, client.id);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const uid = this.socketUser.get(client.id);
    if (uid) this.userSocket.delete(uid);
    this.socketUser.delete(client.id);
  }

  @SubscribeMessage('rooms')
  async listRooms(@MessageBody() data: { type: MinigameType }) {
    return this.rooms.listRooms(data.type);
  }

  @SubscribeMessage('create')
  async create(@ConnectedSocket() client: Socket, @MessageBody() data: { type: MinigameType; betCoin: number }) {
    const uid = this.uid(client);
    if (!uid) return;
    try {
      const res = await this.rooms.createRoom(uid, data.type, data.betCoin);
      client.join(`room:${res.roomId}`);
      this.server.to(`room:${res.roomId}`).emit('lobby', { roomId: res.roomId });
      return res;
    } catch (e: any) { client.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('join')
  async join(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const uid = this.uid(client);
    if (!uid) return;
    try {
      const res = await this.rooms.joinRoom(uid, data.roomId);
      client.join(`room:${data.roomId}`);
      this.server.to(`room:${data.roomId}`).emit('lobby', { roomId: data.roomId, joined: res.seat });
      return res;
    } catch (e: any) { client.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('leave')
  async leave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const uid = this.uid(client);
    if (!uid) return;
    try {
      const res = await this.rooms.leaveRoom(uid, data.roomId);
      client.leave(`room:${data.roomId}`);
      this.server.to(`room:${data.roomId}`).emit('lobby', { roomId: data.roomId, left: true });
      return res;
    } catch (e: any) { client.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('ready')
  async ready(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const uid = this.uid(client);
    if (!uid) return;
    try {
      const res = await this.rooms.ready(uid, data.roomId);
      if (res.started) await this.broadcastState(data.roomId);
      else this.server.to(`room:${data.roomId}`).emit('lobby', { roomId: data.roomId, ready: true });
      return res;
    } catch (e: any) { client.emit('error', { message: e.message }); }
  }

  @SubscribeMessage('play')
  async play(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; cards: Card[] }) {
    return this.doMove(client, data.roomId, 'play', data.cards);
  }

  @SubscribeMessage('pass')
  async pass(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    return this.doMove(client, data.roomId, 'pass');
  }

  @SubscribeMessage('caroMove')
  async caroMove(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string; x: number; y: number }) {
    const uid = this.uid(client);
    if (!uid) return;
    try {
      const res = await this.rooms.caroMove(uid, data.roomId, data.x, data.y);
      this.server.to(`room:${data.roomId}`).emit('update', { roomId: data.roomId });
      if (res.finished) this.server.to(`room:${data.roomId}`).emit('finished', { winnerSeat: res.winnerSeat });
      return { ok: true };
    } catch (e: any) { client.emit('error', { message: e.message }); }
  }

  private async doMove(client: Socket, roomId: string, action: 'play' | 'pass', cards?: Card[]) {
    const uid = this.uid(client);
    if (!uid) return;
    try {
      const res = await this.rooms.play(uid, roomId, action, cards);
      await this.broadcastState(roomId);
      if (res.finished) this.server.to(`room:${roomId}`).emit('finished', { winnerSeat: res.winnerSeat });
      return { ok: true };
    } catch (e: any) { client.emit('error', { message: e.message }); }
  }

  // Báo có cập nhật; mỗi client tự gọi 'view' để lấy state riêng (ẩn bài người khác)
  private async broadcastState(roomId: string) {
    this.server.to(`room:${roomId}`).emit('update', { roomId });
  }

  @SubscribeMessage('view')
  async view(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const uid = this.uid(client);
    if (!uid) return;
    try {
      return await this.rooms.view(uid, data.roomId);
    } catch (e: any) { client.emit('error', { message: e.message }); }
  }

  private uid(client: Socket): string | undefined {
    const id = this.socketUser.get(client.id);
    if (!id) client.emit('error', { message: 'Chưa xác thực' });
    return id;
  }
}
