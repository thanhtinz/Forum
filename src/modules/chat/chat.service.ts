import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatChannelType, ChatMessageType } from '@prisma/client';
import { PrisonService } from '../moderation/prison.service';
import { AdminConfigService } from '../admin/admin-config.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prison: PrisonService,
    private readonly config: AdminConfigService,
    private readonly notif: NotificationsService,
  ) {}

  // Gõ @username trong chat → gửi thông báo (app + push + email) cho người được nhắc
  private async notifyChatMentions(content: string, senderId: string) {
    const names = Array.from(new Set((content.match(/@(\w{1,30})/g) || []).map((s) => s.slice(1))));
    if (names.length === 0) return;
    const users = await this.prisma.user.findMany({
      where: { username: { in: names }, status: 'ACTIVE', id: { not: senderId } },
      select: { id: true },
    });
    if (users.length === 0) return;
    const sender = (await this.usersMap([senderId])).get(senderId) as any;
    const who = sender?.displayName || sender?.username || 'Ai đó';
    const body = content.length > 120 ? content.slice(0, 120) + '…' : content;
    for (const u of users) {
      this.notif.notify(u.id, { type: 'POST_MENTION', title: `${who} nhắc bạn trong chat`, body, link: '/chat', actorId: senderId }).catch(() => {});
    }
  }

  // ──────────────────────────────────────────────
  // TÌM GIF (proxy server-side, dùng key cấu hình trong admin: Giphy/Tenor)
  // ──────────────────────────────────────────────
  async searchGifs(q: string) {
    const provider = await this.config.get<string>('gif.provider', 'giphy');
    const apiKey = await this.config.get<string>('gif.apiKey', '');
    if (!apiKey) return { configured: false, results: [] as { id: string; url: string; preview: string }[] };
    const term = (q || '').trim();
    try {
      if (provider === 'tenor') {
        const url = `https://tenor.googleapis.com/v2/${term ? 'search' : 'featured'}?${term ? `q=${encodeURIComponent(term)}&` : ''}key=${apiKey}&limit=24&media_filter=gif,tinygif`;
        const res = await fetch(url);
        if (!res.ok) return { configured: true, results: [] };
        const data: any = await res.json();
        const results = (data.results || []).map((r: any) => ({
          id: String(r.id),
          url: r.media_formats?.gif?.url || r.media_formats?.tinygif?.url,
          preview: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url,
        })).filter((g: any) => g.url);
        return { configured: true, results };
      }
      // Giphy (mặc định)
      const base = term
        ? `https://api.giphy.com/v1/gifs/search?q=${encodeURIComponent(term)}`
        : `https://api.giphy.com/v1/gifs/trending?`;
      const url = `${base}${term ? '&' : ''}api_key=${apiKey}&limit=24&rating=pg-13`;
      const res = await fetch(url);
      if (!res.ok) return { configured: true, results: [] };
      const data: any = await res.json();
      const results = (data.data || []).map((g: any) => ({
        id: String(g.id),
        url: g.images?.downsized_medium?.url || g.images?.original?.url,
        preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url,
      })).filter((g: any) => g.url);
      return { configured: true, results };
    } catch {
      return { configured: true, results: [] };
    }
  }

  // Batch-lấy thông tin user (ChatMessage/ChatMember chỉ lưu id, không có relation)
  private async usersMap(ids: (string | null | undefined)[]) {
    const uniq = [...new Set(ids.filter((x): x is string => !!x))];
    if (!uniq.length) return new Map<string, any>();
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniq } },
      select: { id: true, username: true, displayName: true, avatar: true, role: true, verifiedBadge: true },
    });
    return new Map(users.map((u) => [u.id, u]));
  }

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
    await this.prison.assertNotJailed(userId);
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

    // Nhắc người qua @username trong tin nhắn văn bản (fire-and-forget)
    if (data.type === 'TEXT' && data.content) void this.notifyChatMentions(data.content, userId);

    const sender = (await this.usersMap([userId])).get(userId) || null;
    return { ...message, sender };
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

    const map = await this.usersMap(messages.flatMap((m) => [m.senderId, m.replyTo?.senderId]));
    return messages.reverse().map((m) => ({
      ...m,
      sender: map.get(m.senderId) || null,
      replyTo: m.replyTo ? { ...m.replyTo, sender: map.get(m.replyTo.senderId) || null } : null,
    }));
  }

  // ──────────────────────────────────────────────
  // XOÁ TIN NHẮN (chủ tin nhắn, hoặc admin/mod)
  // ──────────────────────────────────────────────
  private async isStaff(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return !!u && (u.role === 'ADMIN' || u.role === 'MODERATOR');
  }

  async deleteMessage(userId: string, messageId: string) {
    const msg = await this.prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundException('Tin nhắn không tồn tại');
    if (msg.senderId !== userId && !(await this.isStaff(userId))) {
      throw new ForbiddenException('Không có quyền xoá tin nhắn này');
    }
    await this.prisma.chatMessage.update({ where: { id: messageId }, data: { isDeleted: true } });
    return { ok: true, id: messageId, channelId: msg.channelId };
  }

  // Xoá toàn bộ tin nhắn 1 kênh (reset) — chỉ admin/mod
  async clearChannel(userId: string, channelId: string) {
    if (!(await this.isStaff(userId))) throw new ForbiddenException('Chỉ admin/mod được xoá toàn bộ');
    const channel = await this.prisma.chatChannel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Kênh không tồn tại');
    await this.prisma.chatMessage.updateMany({ where: { channelId, isDeleted: false }, data: { isDeleted: true } });
    return { ok: true, channelId };
  }

  // ──────────────────────────────────────────────
  // DANH SÁCH KÊNH CỦA USER
  // ──────────────────────────────────────────────
  async getUserChannels(userId: string) {
    const channels = await this.prisma.chatChannel.findMany({
      where: {
        OR: [
          { type: 'GLOBAL' },
          { members: { some: { userId } } },
        ],
        isActive: true,
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        members: true,
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });

    const map = await this.usersMap(channels.flatMap((c) => c.members.map((m) => m.userId)));
    return channels.map((c) => {
      const members = c.members.map((m) => ({ ...m, user: map.get(m.userId) || null }));
      // Với chat riêng: tên & avatar lấy theo người còn lại
      const other = c.type === 'PRIVATE' ? members.find((m) => m.userId !== userId)?.user : null;
      const title = c.type === 'PRIVATE'
        ? (other?.displayName || other?.username || 'Chat riêng')
        : (c.name || (c.type === 'GLOBAL' ? 'Chat Tổng' : 'Nhóm'));
      return {
        id: c.id,
        type: c.type,
        title,
        avatarUrl: c.type === 'PRIVATE' ? other?.avatar || null : c.avatarUrl,
        lastMessageAt: c.lastMessageAt,
        memberCount: members.length,
        members,
        lastMessage: c.messages[0] || null,
      };
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
