import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStorefrontDto, UpdateStorefrontDto } from './marketplace.dto';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // STOREFRONT — gian hàng riêng (1 user 1 gian hàng)
  // ──────────────────────────────────────────────
  async createStorefront(ownerId: string, dto: CreateStorefrontDto) {
    const existing = await this.prisma.storefront.findUnique({
      where: { ownerId },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Bạn đã có gian hàng');

    const slug = await this.generateUniqueSlug(dto.name);

    return this.prisma.storefront.create({
      data: {
        ownerId,
        slug,
        name: dto.name,
        tagline: dto.tagline,
        description: dto.description,
        bannerUrl: dto.bannerUrl,
        logoUrl: dto.logoUrl,
        policyRefund: dto.policyRefund,
        socialLinks: (dto.socialLinks ?? undefined) as Prisma.InputJsonValue,
      },
    });
  }

  async updateStorefront(ownerId: string, dto: UpdateStorefrontDto) {
    const store = await this.prisma.storefront.findUnique({ where: { ownerId } });
    if (!store) throw new NotFoundException('Bạn chưa có gian hàng');

    return this.prisma.storefront.update({
      where: { ownerId },
      data: {
        name: dto.name ?? undefined,
        tagline: dto.tagline ?? undefined,
        description: dto.description ?? undefined,
        bannerUrl: dto.bannerUrl ?? undefined,
        logoUrl: dto.logoUrl ?? undefined,
        policyRefund: dto.policyRefund ?? undefined,
        socialLinks: (dto.socialLinks ?? undefined) as Prisma.InputJsonValue,
      },
    });
  }

  // gian hàng của chính user (dashboard)
  async myStorefront(ownerId: string) {
    return this.prisma.storefront.findUnique({ where: { ownerId } });
  }

  // ──────────────────────────────────────────────
  // PUBLIC — danh sách + trang storefront
  // ──────────────────────────────────────────────
  async listStorefronts(page = 1, limit = 20, q?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.StorefrontWhereInput = {
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { tagline: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.storefront.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isVerified: 'desc' }, { totalSales: 'desc' }],
      }),
      this.prisma.storefront.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getStorefront(slug: string, viewerId?: string) {
    const store = await this.prisma.storefront.findUnique({ where: { slug } });
    if (!store || !store.isActive) throw new NotFoundException('Gian hàng không tồn tại');

    let isFollowing = false;
    if (viewerId) {
      const follow = await this.prisma.storefrontFollow.findUnique({
        where: { userId_storefrontId: { userId: viewerId, storefrontId: store.id } },
      });
      isFollowing = !!follow;
    }

    return { ...store, isFollowing };
  }

  // ──────────────────────────────────────────────
  // FOLLOW / UNFOLLOW
  // ──────────────────────────────────────────────
  async follow(userId: string, storefrontId: string) {
    const store = await this.prisma.storefront.findUnique({
      where: { id: storefrontId },
      select: { id: true, ownerId: true },
    });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');
    if (store.ownerId === userId) {
      throw new BadRequestException('Không thể theo dõi gian hàng của chính mình');
    }

    const existing = await this.prisma.storefrontFollow.findUnique({
      where: { userId_storefrontId: { userId, storefrontId } },
    });
    if (existing) return { following: true };

    await this.prisma.$transaction([
      this.prisma.storefrontFollow.create({ data: { userId, storefrontId } }),
      this.prisma.storefront.update({
        where: { id: storefrontId },
        data: { followerCount: { increment: 1 } },
      }),
    ]);
    return { following: true };
  }

  async unfollow(userId: string, storefrontId: string) {
    const existing = await this.prisma.storefrontFollow.findUnique({
      where: { userId_storefrontId: { userId, storefrontId } },
    });
    if (!existing) return { following: false };

    await this.prisma.$transaction([
      this.prisma.storefrontFollow.delete({
        where: { userId_storefrontId: { userId, storefrontId } },
      }),
      this.prisma.storefront.update({
        where: { id: storefrontId },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);
    return { following: false };
  }

  // ──────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────
  private async generateUniqueSlug(name: string): Promise<string> {
    let slug = slugify(name, { lower: true, strict: true, locale: 'vi' });
    if (!slug) slug = 'shop';
    const exists = await this.prisma.storefront.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${createId().slice(0, 6)}`;
    return slug;
  }
}
