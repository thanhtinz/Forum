import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BlockService {
  constructor(private readonly prisma: PrismaService) {}

  async toggle(blockerId: string, blockedId: string): Promise<{ blocked: boolean }> {
    if (blockerId === blockedId) {
      throw new BadRequestException('Không thể chặn chính mình');
    }
    const existing = await this.prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existing) {
      await this.prisma.userBlock.delete({
        where: { blockerId_blockedId: { blockerId, blockedId } },
      });
      return { blocked: false };
    }
    await this.prisma.userBlock.create({ data: { blockerId, blockedId } });
    return { blocked: true };
  }

  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const existing = await this.prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    return !!existing;
  }

  async listBlocked(blockerId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
      include: {
        blocked: { select: { id: true, username: true, displayName: true, avatar: true } },
      },
    });
    return blocks.map((b) => b.blocked);
  }
}
