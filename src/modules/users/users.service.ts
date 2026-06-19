import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true, username: true, displayName: true, avatar: true, bio: true,
        role: true, reputationScore: true, threadCount: true, postCount: true,
        verifiedBadge: true,
        createdAt: true, lastSeenAt: true,
        badges: { include: { badge: true } },
      },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');
    return user;
  }

  async updateProfile(userId: string, data: { displayName?: string; bio?: string; avatar?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, displayName: true, bio: true, avatar: true },
    });
  }

  // Cấu hình AI riêng của user (tự đấu key Gemini/OpenAI + chọn model)
  async getAiSettings(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { aiProvider: true, aiModel: true, aiApiKey: true, aiBaseUrl: true },
    });
    return {
      provider: u?.aiProvider ?? '',
      model: u?.aiModel ?? '',
      baseUrl: u?.aiBaseUrl ?? '',
      hasKey: !!u?.aiApiKey, // không trả key thật về client
    };
  }

  async updateAiSettings(userId: string, data: { provider?: string; model?: string; apiKey?: string; baseUrl?: string }) {
    const patch: any = {};
    if (data.provider !== undefined) patch.aiProvider = data.provider || null;
    if (data.model !== undefined) patch.aiModel = data.model?.trim() || null;
    if (data.baseUrl !== undefined) patch.aiBaseUrl = data.baseUrl?.trim() || null;
    // apiKey: chuỗi rỗng = xoá key; undefined = giữ nguyên
    if (data.apiKey !== undefined) patch.aiApiKey = data.apiKey.trim() || null;
    await this.prisma.user.update({ where: { id: userId }, data: patch });
    return { ok: true };
  }
}
