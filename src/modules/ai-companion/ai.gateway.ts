import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AiCompanionService } from './ai-companion.service';

@WebSocketGateway({
  namespace: '/ai',
  cors: { origin: '*' },
})
export class AiGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(AiGateway.name);
  private socketUsers = new Map<string, string>(); // socketId → userId

  constructor(
    private readonly aiService: AiCompanionService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
      this.socketUsers.set(client.id, payload.sub);
      this.logger.log(`AI client connected: ${payload.username}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.socketUsers.delete(client.id);
  }

  // ──────────────────────────────────────────────
  // CLIENT GỬI TIN NHẮN
  // ──────────────────────────────────────────────
  @SubscribeMessage('chat')
  async handleChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; message: string },
  ) {
    const userId = this.socketUsers.get(client.id);
    if (!userId) {
      client.emit('error', { message: 'Chưa xác thực' });
      return;
    }

    try {
      // Stream từng chunk xuống client
      for await (const chunk of this.aiService.streamMessage(
        data.sessionId,
        userId,
        data.message,
      )) {
        if (chunk.emotion && chunk.expressionId) {
          // Gửi lệnh đổi biểu cảm Live2D
          client.emit('emotion', {
            emotion: chunk.emotion,
            expressionId: chunk.expressionId,
          });
        }
        if (chunk.text) {
          client.emit('chunk', { text: chunk.text });
        }
        if (chunk.done) {
          client.emit('done', { emotion: chunk.emotion });
          if (chunk.bond) {
            // Báo độ thân thiết tăng / mở khoá outfit mới
            client.emit('bond', chunk.bond);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`AI chat error: ${err.message}`);
      client.emit('error', { message: err?.message || 'Lỗi xử lý AI' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket) {
    // Client báo đang gõ → có thể trigger idle animation
    client.emit('ack');
  }
}
