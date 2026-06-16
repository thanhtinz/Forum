import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductType, ProductStatus } from '@prisma/client';
import slugify from 'slugify';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MarketplaceShopService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // DANH MỤC (admin tạo, seller không)
  // ──────────────────────────────────────────────
  listCategories() {
    return this.prisma.marketCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }
  adminCreateCategory(data: { name: string; slug?: string; icon?: string; sortOrder?: number }) {
    const slug = data.slug || slugify(data.name, { lower: true, strict: true });
    return this.prisma.marketCategory.create({ data: { name: data.name, slug, icon: data.icon, sortOrder: data.sortOrder ?? 0 } });
  }
  adminUpdateCategory(id: string, data: Record<string, unknown>) {
    delete data.id;
    return this.prisma.marketCategory.update({ where: { id }, data });
  }
  async adminDeleteCategory(id: string) {
    await this.prisma.marketCategory.delete({ where: { id } });
    return { ok: true };
  }

  // ──────────────────────────────────────────────
  // SẢN PHẨM
  // ──────────────────────────────────────────────
  async browseProducts(categorySlug?: string, q?: string, page = 1, limit = 20) {
    const where: Prisma.ProductWhereInput = {
      status: 'ACTIVE',
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take: limit, orderBy: { salesCount: 'desc' },
        select: { id: true, title: true, slug: true, gemPrice: true, isFree: true, thumbnailUrl: true, salesCount: true, ratingAvg: true } }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async storeProducts(slug: string) {
    const store = await this.prisma.storefront.findUnique({ where: { slug }, select: { id: true } });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');
    return this.prisma.product.findMany({
      where: { storefrontId: store.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, slug: true, gemPrice: true, isFree: true, thumbnailUrl: true, salesCount: true },
    });
  }

  async myProducts(userId: string) {
    const store = await this.requireStore(userId);
    return this.prisma.product.findMany({ where: { storefrontId: store.id }, orderBy: { createdAt: 'desc' } });
  }

  async createProduct(userId: string, dto: {
    title: string; description?: string; type?: ProductType; gemPrice?: number;
    isFree?: boolean; categoryId?: string; thumbnailUrl?: string; demoUrl?: string; fileUrl?: string;
  }) {
    const store = await this.requireStore(userId);
    if (!dto.title) throw new BadRequestException('Cần tên sản phẩm');
    let slug = slugify(dto.title, { lower: true, strict: true, locale: 'vi' }) || 'sp';
    if (await this.prisma.product.findUnique({ where: { slug } })) slug = `${slug}-${createId().slice(0, 6)}`;
    return this.prisma.product.create({
      data: {
        sellerId: userId, storefrontId: store.id, categoryId: dto.categoryId || null,
        title: dto.title, slug, description: dto.description ?? '', descriptionRaw: dto.description ?? '',
        type: dto.type ?? 'SOURCE_CODE', status: 'ACTIVE', gemPrice: dto.gemPrice ?? 0, isFree: dto.isFree ?? false,
        thumbnailUrl: dto.thumbnailUrl, demoUrl: dto.demoUrl, fileUrl: dto.fileUrl,
      },
    });
  }

  async updateProduct(userId: string, id: string, data: Record<string, unknown>) {
    await this.ownProduct(userId, id);
    delete data.id; delete data.slug; delete data.sellerId; delete data.storefrontId;
    return this.prisma.product.update({ where: { id }, data });
  }

  async deleteProduct(userId: string, id: string) {
    await this.ownProduct(userId, id);
    await this.prisma.product.delete({ where: { id } });
    return { ok: true };
  }

  // ──────────────────────────────────────────────
  // MÃ GIẢM GIÁ (seller tự tạo)
  // ──────────────────────────────────────────────
  async myCoupons(userId: string) {
    const store = await this.requireStore(userId);
    return this.prisma.coupon.findMany({ where: { storefrontId: store.id }, orderBy: { createdAt: 'desc' } });
  }

  async createCoupon(userId: string, dto: { code: string; discountPercent: number; maxUses?: number; expiresAt?: string }) {
    const store = await this.requireStore(userId);
    const code = dto.code?.trim().toUpperCase();
    if (!code) throw new BadRequestException('Cần mã giảm giá');
    if (dto.discountPercent < 1 || dto.discountPercent > 100) throw new BadRequestException('Giảm giá 1-100%');
    const dup = await this.prisma.coupon.findUnique({ where: { storefrontId_code: { storefrontId: store.id, code } } });
    if (dup) throw new BadRequestException('Mã đã tồn tại');
    return this.prisma.coupon.create({
      data: { storefrontId: store.id, code, discountPercent: dto.discountPercent, maxUses: dto.maxUses ?? 0, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null },
    });
  }

  async toggleCoupon(userId: string, id: string) {
    const store = await this.requireStore(userId);
    const c = await this.prisma.coupon.findFirst({ where: { id, storefrontId: store.id } });
    if (!c) throw new NotFoundException('Mã không tồn tại');
    return this.prisma.coupon.update({ where: { id }, data: { isActive: !c.isActive } });
  }

  async deleteCoupon(userId: string, id: string) {
    const store = await this.requireStore(userId);
    await this.prisma.coupon.deleteMany({ where: { id, storefrontId: store.id } });
    return { ok: true };
  }

  // khách áp mã -> trả % giảm
  async validateCoupon(storefrontId: string, code: string) {
    const c = await this.prisma.coupon.findUnique({
      where: { storefrontId_code: { storefrontId, code: code.trim().toUpperCase() } },
    });
    if (!c || !c.isActive) throw new BadRequestException('Mã không hợp lệ');
    if (c.expiresAt && c.expiresAt.getTime() < Date.now()) throw new BadRequestException('Mã đã hết hạn');
    if (c.maxUses > 0 && c.usedCount >= c.maxUses) throw new BadRequestException('Mã đã hết lượt dùng');
    return { discountPercent: c.discountPercent };
  }

  // ──────────────────────────────────────────────
  // TICKET HỖ TRỢ (mỗi shop)
  // ──────────────────────────────────────────────
  async createTicket(userId: string, storefrontId: string, subject: string, body: string) {
    const store = await this.prisma.storefront.findUnique({ where: { id: storefrontId }, select: { id: true } });
    if (!store) throw new NotFoundException('Gian hàng không tồn tại');
    if (!subject?.trim() || !body?.trim()) throw new BadRequestException('Cần tiêu đề và nội dung');
    return this.prisma.shopTicket.create({
      data: { storefrontId, userId, subject: subject.trim(), messages: { create: { senderId: userId, body: body.trim() } } },
    });
  }

  async myTickets(userId: string) {
    return this.prisma.shopTicket.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  async shopTickets(userId: string, status?: string) {
    const store = await this.requireStore(userId);
    return this.prisma.shopTicket.findMany({
      where: { storefrontId: store.id, ...(status ? { status } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async ticketDetail(userId: string, ticketId: string) {
    const t = await this.prisma.shopTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } }, storefront: { select: { ownerId: true, name: true } } },
    });
    if (!t) throw new NotFoundException('Ticket không tồn tại');
    if (t.userId !== userId && t.storefront.ownerId !== userId) throw new ForbiddenException('Không có quyền');
    return t;
  }

  async replyTicket(userId: string, ticketId: string, body: string) {
    const t = await this.ticketDetail(userId, ticketId);
    if (t.status === 'CLOSED') throw new BadRequestException('Ticket đã đóng');
    const isOwner = t.storefront.ownerId === userId;
    await this.prisma.$transaction([
      this.prisma.shopTicketMessage.create({ data: { ticketId, senderId: userId, body: body.trim() } }),
      this.prisma.shopTicket.update({ where: { id: ticketId }, data: { status: isOwner ? 'ANSWERED' : 'OPEN', updatedAt: new Date() } }),
    ]);
    return { ok: true };
  }

  async closeTicket(userId: string, ticketId: string) {
    await this.ticketDetail(userId, ticketId);
    await this.prisma.shopTicket.update({ where: { id: ticketId }, data: { status: 'CLOSED' } });
    return { ok: true };
  }

  // ──────────────────────────────────────────────
  // helpers
  // ──────────────────────────────────────────────
  private async requireStore(userId: string) {
    const store = await this.prisma.storefront.findUnique({ where: { ownerId: userId }, select: { id: true } });
    if (!store) throw new BadRequestException('Bạn chưa có gian hàng');
    return store;
  }
  private async ownProduct(userId: string, id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, select: { sellerId: true } });
    if (!p) throw new NotFoundException('Sản phẩm không tồn tại');
    if (p.sellerId !== userId) throw new ForbiddenException('Không phải sản phẩm của bạn');
  }
}
