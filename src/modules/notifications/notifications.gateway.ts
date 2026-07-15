import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';

// Đẩy thông báo realtime tới đúng user (room user:{id})
@WebSocketGateway({ namespace: '/notif', cors: { origin: '*' } })
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return client.disconnect();
      const payload = await this.jwt.verifyAsync(token, { secret: this.config.get('JWT_ACCESS_SECRET') });
      client.join(`user:${payload.sub}`);
    } catch { client.disconnect(); }
  }

  handleDisconnect() { /* socket.io tự rời room */ }

  @OnEvent('notification.created')
  push(data: { userId: string; notification: any }) {
    this.server.to(`user:${data.userId}`).emit('notification', data.notification);
  }

  // Tin nhắn hội thoại (DM) realtime — dùng chung socket /notif, tránh mở thêm kết nối.
  @OnEvent('conversation.message')
  pushConversationMessage(data: { userId: string; conversationId: string; message: any }) {
    this.server.to(`user:${data.userId}`).emit('conversation.message', { conversationId: data.conversationId, message: data.message });
  }

  @OnEvent('conversation.read')
  pushConversationRead(data: { userId: string; conversationId: string; readerId: string; readAt: Date }) {
    this.server.to(`user:${data.userId}`).emit('conversation.read', { conversationId: data.conversationId, readerId: data.readerId, readAt: data.readAt });
  }
}
