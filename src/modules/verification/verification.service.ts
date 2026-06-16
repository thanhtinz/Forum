import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface VerifyRequirements {
  minPosts: number;
  minReactionsReceived: number;
  minReputation: number;
  minThreads: number;
}

export interface SetRequirementsDto {
  minPosts: number;
  minReactionsReceived: number;
  minReputation: number;
  minThreads: number;
}

const CONFIG_KEY = 'verify.requirements';

const DEFAULT_REQUIREMENTS: VerifyRequirements = {
  minPosts: 100,
  minReactionsReceived: 500,
  minReputation: 0,
  minThreads: 0,
};

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getRequirements(): Promise<VerifyRequirements> {
    const cfg = await this.prisma.siteConfig
      .findUnique({ where: { key: CONFIG_KEY } })
      .catch(() => null);
    const v = cfg?.value as Partial<VerifyRequirements> | null | undefined;
    const num = (x: unknown, d: number) =>
      typeof x === 'number' && Number.isFinite(x)
        ? x
        : typeof x === 'string' && Number.isFinite(parseInt(x, 10))
          ? parseInt(x, 10)
          : d;
    return {
      minPosts: num(v?.minPosts, DEFAULT_REQUIREMENTS.minPosts),
      minReactionsReceived: num(
        v?.minReactionsReceived,
        DEFAULT_REQUIREMENTS.minReactionsReceived,
      ),
      minReputation: num(v?.minReputation, DEFAULT_REQUIREMENTS.minReputation),
      minThreads: num(v?.minThreads, DEFAULT_REQUIREMENTS.minThreads),
    };
  }

  async setRequirements(dto: SetRequirementsDto): Promise<VerifyRequirements> {
    const clamp = (x: number) =>
      Number.isFinite(x) && x >= 0 ? Math.floor(x) : 0;
    const value: VerifyRequirements = {
      minPosts: clamp(Number(dto.minPosts)),
      minReactionsReceived: clamp(Number(dto.minReactionsReceived)),
      minReputation: clamp(Number(dto.minReputation)),
      minThreads: clamp(Number(dto.minThreads)),
    };
    const json = { ...value };
    await this.prisma.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: json },
      create: { key: CONFIG_KEY, value: json },
    });
    return value;
  }

  async getUserStats(userId: string) {
    const [user, reactionsReceived] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { postCount: true, threadCount: true, reputationScore: true },
      }),
      this.prisma.postReaction.count({
        where: { post: { authorId: userId, isDeleted: false } },
      }),
    ]);
    return {
      posts: user?.postCount ?? 0,
      threads: user?.threadCount ?? 0,
      reputation: user?.reputationScore ?? 0,
      reactionsReceived,
    };
  }

  private isEligible(
    stats: { posts: number; threads: number; reputation: number; reactionsReceived: number },
    req: VerifyRequirements,
  ): boolean {
    return (
      stats.posts >= req.minPosts &&
      stats.reactionsReceived >= req.minReactionsReceived &&
      stats.reputation >= req.minReputation &&
      stats.threads >= req.minThreads
    );
  }

  async getStatus(userId: string) {
    const [user, requirements, stats, latestRequest, pendingReq] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { verifiedBadge: true },
        }),
        this.getRequirements(),
        this.getUserStats(userId),
        this.prisma.verificationRequest.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.verificationRequest.findFirst({
          where: { userId, status: 'PENDING' },
        }),
      ]);

    return {
      verified: user?.verifiedBadge ?? false,
      requirements,
      stats,
      eligible: this.isEligible(stats, requirements),
      pending: !!pendingReq,
      latestRequest,
    };
  }

  async submitRequest(userId: string) {
    const [user, requirements, stats, pendingReq] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { verifiedBadge: true },
      }),
      this.getRequirements(),
      this.getUserStats(userId),
      this.prisma.verificationRequest.findFirst({
        where: { userId, status: 'PENDING' },
      }),
    ]);

    if (user?.verifiedBadge) {
      throw new BadRequestException('Tài khoản của bạn đã được xác minh');
    }
    if (pendingReq) {
      throw new BadRequestException('Bạn đã có một yêu cầu đang chờ duyệt');
    }
    if (!this.isEligible(stats, requirements)) {
      throw new BadRequestException('Bạn chưa đủ điều kiện để gửi yêu cầu xác minh');
    }

    return this.prisma.verificationRequest.create({
      data: { userId, status: 'PENDING' },
    });
  }

  async listRequests(status?: string) {
    const filter = status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status)
      ? status
      : 'PENDING';
    const requirements = await this.getRequirements();
    const requests = await this.prisma.verificationRequest.findMany({
      where: { status: filter },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
      },
    });

    const withStats = await Promise.all(
      requests.map(async (r) => ({
        ...r,
        stats: await this.getUserStats(r.userId),
      })),
    );

    return { requirements, requests: withStats };
  }

  async approve(requestId: string, adminId: string) {
    const req = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.verificationRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
      await tx.user.update({
        where: { id: req.userId },
        data: { verifiedBadge: true },
      });
      return updated;
    });
  }

  async reject(requestId: string, adminId: string, note?: string) {
    const req = await this.prisma.verificationRequest.findUnique({
      where: { id: requestId },
    });
    if (!req) throw new NotFoundException('Không tìm thấy yêu cầu');

    return this.prisma.verificationRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        note: note ?? null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });
  }
}
