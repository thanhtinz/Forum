import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { sanitizeRichHtml } from '../../common/html.util';
import { marked } from 'marked';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly events: EventEmitter2,
  ) {}

  // Tạo cuộc hội thoại mới với 1 hoặc nhiều người
  async create(senderId: string, dto: { recipientIds: string[]; title?: string; content: string }) {
    if (!dto.recipientIds.length) throw new BadRequestException('Phải có ít nhất 1 người nhận');
    if (dto.recipientIds.includes(senderId)) throw new BadRequestException('Không thể tự nhắn cho chính mình');
    if (dto.recipientIds.length > 9) throw new BadRequestException('Tối đa 10 người trong một cuộc hội thoại');

    // Kiểm tra người nhận tồn tại
    const recipients = await this.prisma.user.findMany({
      where: { id: { in: dto.recipientIds } },
      select: { id: true, username: true, displayName: true },
    });
    if (recipients.length !== dto.recipientIds.length) throw new NotFoundException('Một số người dùng không tồn tại');

    const content = await this.renderContent(dto.content);

    const conv = await this.prisma.$transaction(async (tx) => {
      const c = await tx.conversation.create({
        data: {
          title: dto.title || null,
          participants: {
            create: [senderId, ...dto.recipientIds].map((uid) => ({ userId: uid })),
          },
          messages: {
            create: { senderId, content, contentRaw: dto.content },
          },
        },
      });
      return c;
    });

    // Thông báo cho người nhận
    const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { username: true, displayName: true } });
    await Promise.all(recipients.map((r) =>
      this.notifications.notify(r.id, {
        type: 'SYSTEM',
        title: `${sender?.displayName || sender?.username} đã gửi tin nhắn cho bạn`,
        body: dto.title || dto.content.slice(0, 80),
        link: `/conversations?id=${conv.id}`,
        actorId: senderId,
      }).catch(() => {}),
    ));

    return conv;
  }

  // Danh sách cuộc hội thoại của user (chưa bị xoá)
  async listMine(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { userId, isDeleted: false },
      orderBy: { conversation: { lastMessageAt: 'desc' } },
      skip,
      take: limit,
      include: {
        conversation: {
          include: {
            participants: {
              where: { isDeleted: false },
              include: { user: { select: { id: true, username: true, displayName: true, avatar: true } } },
            },
            messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, createdAt: true, senderId: true } },
          },
        },
      },
    });

    return parts.map((p) => {
      const conv = p.conversation;
      const others = conv.participants.filter((pp) => pp.userId !== userId).map((pp) => pp.user);
      const lastMsg = conv.messages[0] || null;
      const hasUnread = lastMsg && lastMsg.createdAt > p.lastReadAt;
      return {
        id: conv.id,
        title: conv.title,
        lastMessageAt: conv.lastMessageAt,
        participants: others,
        lastMessage: lastMsg,
        hasUnread,
      };
    });
  }

  // Xem chi tiết + tin nhắn của 1 cuộc hội thoại
  async getMessages(convId: string, userId: string, page = 1, limit = 30) {
    await this.assertParticipant(convId, userId);

    const skip = (page - 1) * limit;
    const [messages, total] = await Promise.all([
      this.prisma.conversationMessage.findMany({
        where: { conversationId: convId, isDeleted: false },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
        include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } },
      }),
      this.prisma.conversationMessage.count({ where: { conversationId: convId, isDeleted: false } }),
    ]);

    // Đánh dấu đã đọc
    const readAt = new Date();
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId: convId, userId },
      data: { lastReadAt: readAt },
    });

    // Báo cho các thành viên khác biết "đã xem" (đẩy realtime qua socket)
    const otherIds = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: convId, userId: { not: userId }, isDeleted: false },
      select: { userId: true },
    });
    otherIds.forEach((o) => this.events.emit('conversation.read', { userId: o.userId, conversationId: convId, readerId: userId, readAt }));

    // Lấy thông tin participants — kèm lastReadAt để suy ra "đã xem đến đâu" cho từng tin nhắn
    // (so sánh message.createdAt <= participant.lastReadAt) thay vì cần bảng read-receipt riêng.
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: convId, isDeleted: false },
      select: { lastReadAt: true, user: { select: { id: true, username: true, displayName: true, avatar: true } } },
    });

    return {
      data: messages,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      participants: participants.map((p) => ({ ...p.user, lastReadAt: p.lastReadAt })),
    };
  }

  // Gửi tin nhắn trong cuộc hội thoại
  async sendMessage(convId: string, senderId: string, contentRaw: string) {
    const part = await this.assertParticipant(convId, senderId);
    if (!contentRaw.trim()) throw new BadRequestException('Tin nhắn không được trống');

    const content = await this.renderContent(contentRaw);
    const [msg] = await this.prisma.$transaction([
      this.prisma.conversationMessage.create({
        data: { conversationId: convId, senderId, content, contentRaw },
        include: { sender: { select: { id: true, username: true, displayName: true, avatar: true } } },
      }),
      this.prisma.conversation.update({
        where: { id: convId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    // Thông báo cho các participants khác
    const others = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: convId, userId: { not: senderId }, isDeleted: false },
      select: { userId: true },
    });
    const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { username: true, displayName: true } });
    await Promise.all(others.map((o) =>
      this.notifications.notify(o.userId, {
        type: 'SYSTEM',
        title: `${sender?.displayName || sender?.username} đã trả lời trong hội thoại`,
        body: contentRaw.slice(0, 80),
        link: `/conversations?id=${convId}`,
        actorId: senderId,
      }).catch(() => {}),
    ));

    // Đẩy tin nhắn realtime tới tất cả thành viên (kể cả người gửi, để đồng bộ đa thiết bị/tab)
    const allParticipants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId: convId, isDeleted: false },
      select: { userId: true },
    });
    allParticipants.forEach((p) => this.events.emit('conversation.message', { userId: p.userId, conversationId: convId, message: msg }));

    return msg;
  }

  // Rời / xoá cuộc hội thoại khỏi inbox (soft delete)
  async leave(convId: string, userId: string) {
    await this.assertParticipant(convId, userId);
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId: convId, userId },
      data: { isDeleted: true },
    });
    return { ok: true };
  }

  // Xoá tin nhắn của chính mình
  async deleteMessage(msgId: string, userId: string) {
    const msg = await this.prisma.conversationMessage.findUnique({
      where: { id: msgId },
      select: { id: true, senderId: true, conversationId: true },
    });
    if (!msg) throw new NotFoundException('Tin nhắn không tồn tại');
    if (msg.senderId !== userId) throw new ForbiddenException('Chỉ có thể xoá tin nhắn của chính mình');
    return this.prisma.conversationMessage.update({ where: { id: msgId }, data: { isDeleted: true } });
  }

  // Số hội thoại chưa đọc (cho badge)
  async unreadCount(userId: string): Promise<number> {
    const parts = await this.prisma.conversationParticipant.findMany({
      where: { userId, isDeleted: false },
      include: { conversation: { select: { lastMessageAt: true } } },
    });
    return parts.filter((p) => p.conversation.lastMessageAt > p.lastReadAt).length;
  }

  private async assertParticipant(convId: string, userId: string) {
    const p = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId: convId, userId } },
    });
    if (!p || p.isDeleted) throw new ForbiddenException('Bạn không thuộc cuộc hội thoại này');
    return p;
  }

  private async renderContent(raw: string): Promise<string> {
    // Luôn làm sạch HTML (chống stored XSS): nội dung có sẵn thẻ thì sanitize whitelist,
    // nội dung markdown/text thì render qua marked rồi vẫn sanitize kết quả.
    const html = /<[^>]+>/.test(raw) ? raw : (marked.parse(raw) as string);
    return sanitizeRichHtml(html);
  }
}
