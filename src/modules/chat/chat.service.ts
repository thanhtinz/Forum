import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatChannelType, ChatMessageType } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // LẤY/TẠO KÊNH GLOBAL (chat tổng — duy nhất)
  // ──────────────────────────────────────────────
  async getGlobalChannel() {
    let channel = await this.prisma.chatChannel.findFirst({
      where: { type: 'GLOBAL' },
    });
    if (!channel) {
      channel = await this.prisma.chatChannel.create({
        data: { type: 'GLOBAL', name: 'Chat Tổng' },
      });
    }
    return channel;
  }

  // ──────────────────────────────────────────────
  // CHAT RIÊNG (1-1) — tìm hoặc tạo
  // ──────────────────────────────────────────────
  async getOrCreatePrivateChannel(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new BadRequestException('Không thể chat với chính mình');

    // Tìm kênh private đã có giữa 2 người
    const existing = await this.prisma.chatChannel.findFirst({
      where: {
        type: 'PRIVATE',
        members: { every: { userId: { in: [userId, targetUserId] } } },
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: { members: true },
    });

    if (existing && existing.members.length === 2) return existing;

    // Tạo mới
    return this.prisma.chatChannel.create({
      data: {
        type: 'PRIVATE',
        members: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: { members: true },
    });
  }

  // ──────────────────────────────────────────────
  // CHAT NHÓM — tạo
  // ──────────────────────────────────────────────
  async createGroupChannel(creatorId: string, name: string, memberIds: string[]) {
    const allMembers = [...new Set([creatorId, ...memberIds])];
    return this.prisma.chatChannel.create({
      data: {
        type: 'GROUP',
        name,
        createdById: creatorId,
        members: {
          create: allMembers.map((uid) => ({
            userId: uid,
            isAdmin: uid === creatorId,
          })),
        },
      },
      include: { members: true },
    });
  }

  // ──────────────────────────────────────────────
  // CHAT GUILD — lấy theo guild
  // ──────────────────────────────────────────────
  async getGuildChannel(guildId: string, userId: string) {
    // Verify user trong guild
    const char = await this.prisma.gameCharacter.findUnique({
      where: { userId },
      include: { guildMember: true },
    });
    if (!char?.guildMember || char.guildMember.guildId !== guildId)
      throw new ForbiddenException('Bạn không ở trong guild này');

    let channel = await this.prisma.chatChannel.findUnique({
      where: { guildId },
    });
    if (!channel) {
      const guild = await this.prisma.guild.findUnique({ where: { id: guildId } });
      channel = await this.prisma.chatChannel.create({
        data: { type: 'GUILD', name: `Guild: ${guild?.name}`, guildId },
      });
    }
    return channel;
  }

  // ──────────────────────────────────────────────
  // GỬI TIN NHẮN (text, emoji, sticker, gif, media, music)
  // ──────────────────────────────────────────────
  async sendMessage(userId: string, data: {
    channelId: string;
    type: ChatMessageType;
    content: string;
    metadata?: any;
    replyToId?: string;
  }) {
    const channel = await this.prisma.chatChannel.findUnique({
      where: { id: data.channelId },
    });
    if (!channel) throw new NotFoundException('Kênh chat không tồn tại');

    // Verify quyền gửi (global thì ai cũng gửi được, khác thì phải là member)
    if (channel.type !== 'GLOBAL') {
      const member = await this.prisma.chatMember.findUnique({
        where: { channelId_userId: { channelId: data.channelId, userId } },
      });
      if (!member) throw new ForbiddenException('Bạn không thuộc kênh này');
      if (member.isMuted) throw new ForbiddenException('Bạn đã bị tắt tiếng');
    }

    // Validate music link
    if (data.type === 'MUSIC') {
      const provider = this.detectMusicProvider(data.content);
      if (!provider) throw new BadRequestException('Link nhạc không hợp lệ');
      data.metadata = { ...data.metadata, provider };
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        channelId: data.channelId,
        senderId: userId,
        type: data.type,
        content: data.content,
        metadata: data.metadata,
        replyToId: data.replyToId,
      },
    });

    await this.prisma.chatChannel.update({
      where: { id: data.channelId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  // ──────────────────────────────────────────────
  // LẤY TIN NHẮN (phân trang)
  // ──────────────────────────────────────────────
  async getMessages(channelId: string, userId: string, before?: string, limit = 50) {
    const channel = await this.prisma.chatChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Kênh không tồn tại');

    if (channel.type !== 'GLOBAL') {
      const member = await this.prisma.chatMember.findUnique({
        where: { channelId_userId: { channelId, userId } },
      });
      if (!member) throw new ForbiddenException('Không có quyền truy cập');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        channelId,
        isDeleted: false,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        replyTo: { select: { id: true, content: true, type: true, senderId: true } },
      },
    });

    return messages.reverse();
  }

  // ──────────────────────────────────────────────
  // DANH SÁCH KÊNH CỦA USER
  // ──────────────────────────────────────────────
  async getUserChannels(userId: string) {
    return this.prisma.chatChannel.findMany({
      where: {
        OR: [
          { type: 'GLOBAL' },
          { members: { some: { userId } } },
        ],
        isActive: true,
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        members: { take: 5 },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  // ──────────────────────────────────────────────
  // STICKER PACKS
  // ──────────────────────────────────────────────
  async getStickerPacks(userId: string) {
    const packs = await this.prisma.stickerPack.findMany({
      where: { isActive: true },
      include: { stickers: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });

    // Đánh dấu pack premium user đã sở hữu
    const owned = await this.prisma.userStickerPack.findMany({
      where: { userId },
      select: { packId: true },
    });
    const ownedIds = new Set(owned.map((o) => o.packId));

    return packs.map((p) => ({
      ...p,
      isOwned: !p.isPremium || ownedIds.has(p.id),
    }));
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  private detectMusicProvider(url: string): string | null {
    if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
    if (/spotify\.com/.test(url)) return 'spotify';
    if (/soundcloud\.com/.test(url)) return 'soundcloud';
    if (/\.mp3($|\?)/.test(url)) return 'mp3';
    return null;
  }
}
