import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface UpsertFreelancerDto {
  headline?: string;
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  country?: string;
  languages?: string[];
  portfolio?: any;
  experience?: string;
  certifications?: string[];
  available?: boolean;
}

export interface ListFreelancersQuery {
  q?: string;
  skill?: string;
  country?: string;
  sort?: 'rating' | 'recent';
  page?: number;
  limit?: number;
}

const USER_BASIC = {
  id: true,
  username: true,
  displayName: true,
  avatar: true,
} as const;

@Injectable()
export class FreelancerService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: string) {
    return this.prisma.freelancerProfile.findUnique({
      where: { userId },
      include: { user: { select: USER_BASIC } },
    });
  }

  async upsertMine(userId: string, dto: UpsertFreelancerDto) {
    const data: Prisma.FreelancerProfileUncheckedCreateInput = {
      userId,
      headline: dto.headline,
      bio: dto.bio,
      skills: dto.skills ?? [],
      hourlyRate: dto.hourlyRate,
      country: dto.country,
      languages: dto.languages ?? [],
      portfolio: dto.portfolio ?? Prisma.JsonNull,
      experience: dto.experience,
      certifications: dto.certifications ?? [],
      available: dto.available ?? true,
    };
    const update: Prisma.FreelancerProfileUncheckedUpdateInput = {
      headline: dto.headline,
      bio: dto.bio,
      skills: dto.skills,
      hourlyRate: dto.hourlyRate,
      country: dto.country,
      languages: dto.languages,
      portfolio: dto.portfolio === undefined ? undefined : (dto.portfolio ?? Prisma.JsonNull),
      experience: dto.experience,
      certifications: dto.certifications,
      available: dto.available,
    };
    return this.prisma.freelancerProfile.upsert({
      where: { userId },
      create: data,
      update,
      include: { user: { select: USER_BASIC } },
    });
  }

  async getByUser(userId: string) {
    return this.prisma.freelancerProfile.findUnique({
      where: { userId },
      include: { user: { select: USER_BASIC } },
    });
  }

  async list(query: ListFreelancersQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.FreelancerProfileWhereInput = {};
    const and: Prisma.FreelancerProfileWhereInput[] = [];

    if (query.q) {
      and.push({
        OR: [
          { headline: { contains: query.q, mode: 'insensitive' } },
          { bio: { contains: query.q, mode: 'insensitive' } },
          { user: { username: { contains: query.q, mode: 'insensitive' } } },
          { user: { displayName: { contains: query.q, mode: 'insensitive' } } },
        ],
      });
    }
    if (query.skill) and.push({ skills: { has: query.skill } });
    if (query.country) and.push({ country: query.country });
    if (and.length) where.AND = and;

    const orderBy: Prisma.FreelancerProfileOrderByWithRelationInput =
      query.sort === 'recent' ? { createdAt: 'desc' } : { ratingAvg: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.freelancerProfile.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { user: { select: USER_BASIC } },
      }),
      this.prisma.freelancerProfile.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ── Top Freelancer: xếp theo rating rồi số job hoàn thành ──
  // Gắn cờ badge "TOP_FREELANCER" cho người đủ điều kiện (≥4.5★, ≥5 job).
  async top(limit = 10) {
    const data = await this.prisma.freelancerProfile.findMany({
      where: { ratingCount: { gt: 0 } },
      orderBy: [{ ratingAvg: 'desc' }, { jobsDone: 'desc' }, { earned: 'desc' }],
      take: Math.min(50, Math.max(1, limit)),
      include: { user: { select: USER_BASIC } },
    });
    return data.map((p) => ({
      ...p,
      isTop: p.ratingAvg >= 4.5 && p.jobsDone >= 5,
    }));
  }
}
