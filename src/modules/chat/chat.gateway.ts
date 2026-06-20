import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatMessageType } from '@prisma/client';

@WebSocketGateway({ namespace: '/chat', cors: { origin: '*' } })
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);
  private socketUsers = new Map<string, string>();

  constructor(
    private readonly chat: ChatService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return client.disconnect();
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      this.socketUsers.set(client.id, payload.sub);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.socketUsers.delete(client.id);
  }

  // Join room kênh
  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string }) {
    client.join(`channel:${data.channelId}`);
    return { joined: data.channelId };
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string }) {
    client.leave(`channel:${data.channelId}`);
  }

  // Gửi tin nhắn → broadcast tới room
  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      channelId: string;
      type: ChatMessageType;
      content: string;
      metadata?: any;
      replyToId?: string;
    },
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return client.emit('error', { message: 'Chưa xác thực' });

    try {
      const message = await this.chat.sendMessage(userId, data);
      // Broadcast tới tất cả người trong kênh
      this.server.to(`channel:${data.channelId}`).emit('message', message);
      return { sent: true, messageId: message.id };
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  // Typing indicator
  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { channelId: string }) {
    const userId = this.socketUsers.get(client.id);
    client.to(`channel:${data.channelId}`).emit('typing', { userId, channelId: data.channelId });
  }

  // Xoá 1 tin nhắn (chủ tin / admin / mod) → báo cả phòng
  @SubscribeMessage('deleteMessage')
  async handleDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; channelId: string },
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return client.emit('error', { message: 'Chưa xác thực' });
    try {
      const res = await this.chat.deleteMessage(userId, data.messageId);
      this.server.to(`channel:${res.channelId}`).emit('messageDeleted', { id: res.id, channelId: res.channelId });
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }

  // Xoá toàn bộ kênh (reset) — admin/mod
  @SubscribeMessage('clearChannel')
  async handleClear(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) return client.emit('error', { message: 'Chưa xác thực' });
    try {
      await this.chat.clearChannel(userId, data.channelId);
      this.server.to(`channel:${data.channelId}`).emit('channelCleared', { channelId: data.channelId });
    } catch (err: any) {
      client.emit('error', { message: err.message });
    }
  }
}
