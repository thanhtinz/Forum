import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

// Livestream kèo dự đoán: phát realtime tới phòng pred:{id} (công khai, ai cũng xem được)
@WebSocketGateway({ namespace: '/predictions', cors: { origin: '*' } })
export class PredictionGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('join')
  join(@MessageBody() predictionId: string, @ConnectedSocket() client: Socket) {
    if (typeof predictionId === 'string' && predictionId) client.join(`pred:${predictionId}`);
    return { ok: true };
  }

  @SubscribeMessage('leave')
  leave(@MessageBody() predictionId: string, @ConnectedSocket() client: Socket) {
    if (typeof predictionId === 'string' && predictionId) client.leave(`pred:${predictionId}`);
    return { ok: true };
  }

  @OnEvent('prediction.live')
  broadcast(payload: { predictionId: string; type: string; [k: string]: any }) {
    if (!payload?.predictionId) return;
    this.server.to(`pred:${payload.predictionId}`).emit('live', payload);
  }
}
