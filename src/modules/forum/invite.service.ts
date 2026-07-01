import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

export interface CreateInviteCodeDto {
  code?: string;
  role?: UserRole;
  maxUses?: number | null;
  expiresAt?: string | null;
}

@Injectable()
export class InviteService {
  constructor(private readonly prisma: PrismaService) {}

  /** Generate a random 8-char alphanumeric code */
  private generateCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  /** Admin: create an invite code */
  async createCode(adminId: string, dto: CreateInviteCodeDto) {
    const code = dto.code?.trim() || this.generateCode();

    // Check uniqueness
    const existing = await this.prisma.inviteCode.findUnique({ where: { code } });
    if (existing) throw new BadRequestException('Mã mời đã tồn tại');

    return this.prisma.inviteCode.create({
      data: {
        code,
        role: dto.role ?? UserRole.MEMBER,
        maxUses: dto.maxUses ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        createdBy: adminId,
      },
      include: {
        creator: { select: { id: true, username: true, displayName: true } },
      },
    });
  }

  /** Admin: list all invite codes with usage stats */
  async listCodes() {
    return this.prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, username: true, displayName: true } },
        _count: { select: { usedBy: true } },
      },
    });
  }

  /** Admin: delete an invite code */
  async deleteCode(id: string) {
    const code = await this.prisma.inviteCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException('Mã mời không tồn tại');
    await this.prisma.inviteCode.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Validate an invite code and use it for a user.
   * Returns the role to assign.
   */
  async validateAndUse(code: string, userId: string): Promise<UserRole> {
    const invite = await this.prisma.inviteCode.findUnique({ where: { code } });
    if (!invite) throw new BadRequestException('Mã mời không hợp lệ');

    // Check expiry
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      throw new BadRequestException('Mã mời đã hết hạn');
    }

    // Check max uses
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw new BadRequestException('Mã mời đã hết lượt sử dụng');
    }

    // Check if user already used this code
    const alreadyUsed = await this.prisma.inviteCodeUse.findUnique({
      where: { inviteCodeId_userId: { inviteCodeId: invite.id, userId } },
    });
    if (alreadyUsed) throw new BadRequestException('Bạn đã sử dụng mã mời này rồi');

    // Increment uses and create usage record
    await this.prisma.$transaction([
      this.prisma.inviteCode.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      }),
      this.prisma.inviteCodeUse.create({
        data: { inviteCodeId: invite.id, userId },
      }),
    ]);

    return invite.role;
  }

  /**
   * Redeem a code for an existing user — upgrades their role.
   */
  async redeemCode(userId: string, code: string) {
    const role = await this.validateAndUse(code, userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    return { ok: true, role };
  }
}
