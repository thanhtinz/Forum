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
}
