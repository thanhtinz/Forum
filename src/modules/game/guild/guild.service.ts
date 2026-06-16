import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GuildRole } from '@prisma/client';

const GUILD_CREATE_COST = 5000; // coin

@Injectable()
export class GuildService {
  constructor(private readonly prisma: PrismaService) {}

  async createGuild(userId: string, data: { name: string; tag: string; description?: string }) {
    const char = await this.prisma.gameCharacter.findUnique({
      where: { userId },
      include: { guildMember: true },
    });
    if (!char) throw new NotFoundException('Chưa có nhân vật');
    if (char.guildMember) throw new BadRequestException('Bạn đã ở trong một guild');
    if (char.coinBalance < GUILD_CREATE_COST)
      throw new BadRequestException(`Cần ${GUILD_CREATE_COST} Coin để lập guild`);

    // Check trùng tên/tag
    const exists = await this.prisma.guild.findFirst({
      where: { OR: [{ name: data.name }, { tag: data.tag }] },
    });
    if (exists) throw new BadRequestException('Tên hoặc tag guild đã tồn tại');

    const guild = await this.prisma.$transaction(async (tx) => {
      await tx.gameCharacter.update({
        where: { id: char.id },
        data: { coinBalance: { decrement: GUILD_CREATE_COST } },
      });
      await tx.coinTransaction.create({
        data: {
          characterId: char.id, type: 'spend_guild_create', amount: -GUILD_CREATE_COST,
          balanceBefore: char.coinBalance, balanceAfter: char.coinBalance - GUILD_CREATE_COST,
          note: `Lập guild ${data.name}`,
        },
      });
      const g = await tx.guild.create({
        data: { name: data.name, tag: data.tag, description: data.description, leaderId: char.id },
      });
      await tx.guildMember.create({
        data: { guildId: g.id, characterId: char.id, role: 'LEADER' },
      });
      return g;
    });

    return guild;
  }

  async listGuilds(page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.guild.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { level: 'desc' },
        include: { _count: { select: { members: true } } },
      }),
      this.prisma.guild.count(),
    ]);
    return { data, meta: { total, page, limit } };
  }

  async getGuild(guildId: string) {
    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: {
        members: {
          include: {
            character: { include: { user: { select: { username: true, avatar: true } } } },
          },
          orderBy: { contribution: 'desc' },
        },
      },
    });
    if (!guild) throw new NotFoundException('Guild không tồn tại');
    return guild;
  }

  async joinGuild(userId: string, guildId: string) {
    const char = await this.prisma.gameCharacter.findUnique({
      where: { userId },
      include: { guildMember: true },
    });
    if (!char) throw new NotFoundException('Chưa có nhân vật');
    if (char.guildMember) throw new BadRequestException('Bạn đã ở trong một guild');

    const guild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      include: { _count: { select: { members: true } } },
    });
    if (!guild) throw new NotFoundException('Guild không tồn tại');
    if (guild._count.members >= guild.maxMembers) throw new BadRequestException('Guild đã đầy');
    if (char.level < guild.reqLevel)
      throw new BadRequestException(`Cần level ${guild.reqLevel} để vào guild này`);

    return this.prisma.guildMember.create({
      data: { guildId, characterId: char.id, role: 'MEMBER' },
    });
  }

  async leaveGuild(userId: string) {
    const char = await this.prisma.gameCharacter.findUnique({
      where: { userId },
      include: { guildMember: true },
    });
    if (!char?.guildMember) throw new BadRequestException('Bạn không ở trong guild nào');
    if (char.guildMember.role === 'LEADER')
      throw new BadRequestException('Leader phải chuyển quyền trước khi rời guild');

    await this.prisma.guildMember.delete({ where: { id: char.guildMember.id } });
    return { success: true };
  }

  async donateCoin(userId: string, amount: number) {
    const char = await this.prisma.gameCharacter.findUnique({
      where: { userId },
      include: { guildMember: true },
    });
    if (!char?.guildMember) throw new BadRequestException('Bạn không ở trong guild nào');
    if (char.coinBalance < amount) throw new BadRequestException('Không đủ Coin');

    await this.prisma.$transaction([
      this.prisma.gameCharacter.update({
        where: { id: char.id },
        data: { coinBalance: { decrement: amount } },
      }),
      this.prisma.guild.update({
        where: { id: char.guildMember.guildId },
        data: { coinFund: { increment: amount }, exp: { increment: Math.floor(amount / 10) } },
      }),
      this.prisma.guildMember.update({
        where: { id: char.guildMember.id },
        data: { contribution: { increment: amount } },
      }),
      this.prisma.coinTransaction.create({
        data: {
          characterId: char.id, type: 'guild_donate', amount: -amount,
          balanceBefore: char.coinBalance, balanceAfter: char.coinBalance - amount,
          note: 'Đóng góp quỹ guild',
        },
      }),
    ]);

    return { success: true, donated: amount };
  }
}
