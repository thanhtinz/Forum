import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GemService } from '../gem/gem.service';

const HOLD_DAYS = 3;          // giam tiền seller 3 ngày
const PLATFORM_FEE = 0.1;     // 10% phí nền tảng

@Injectable()
export class MarketplaceOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gem: GemService,
  ) {}

  // ──────────────────────────────────────────────
  // MUA SẢN PHẨM (tiền seller bị giam 3 ngày)
  // ──────────────────────────────────────────────
  async buy(buyerId: string, productId: string, couponCode?: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('Sản phẩm không khả dụng');
    if (product.sellerId === buyerId) throw new BadRequestException('Không thể mua sản phẩm của chính mình');

    let price = product.isFree ? 0 : product.gemPrice;
    let appliedCode: string | null = null;

    // Áp mã giảm giá (của shop)
    if (couponCode && product.storefrontId && price > 0) {
      const c = await this.prisma.coupon.findUnique({
        where: { storefrontId_code: { storefrontId: product.storefrontId, code: couponCode.trim().toUpperCase() } },
      });
      if (c && c.isActive && (!c.expiresAt || c.expiresAt.getTime() > Date.now()) && (c.maxUses === 0 || c.usedCount < c.maxUses)) {
        price = Math.floor(price * (1 - c.discountPercent / 100));
        appliedCode = c.code;
        await this.prisma.coupon.update({ where: { id: c.id }, data: { usedCount: { increment: 1 } } });
      } else throw new BadRequestException('Mã giảm giá không hợp lệ');
    }

    if (price > 0) {
      await this.gem.debit(buyerId, price, 'SPEND_PRODUCT', productId, `Mua ${product.title}`);
    }
    const fee = Math.floor(price * PLATFORM_FEE);
    const sellerEarned = price - fee;
    const now = Date.now();

    const order = await this.prisma.$transaction(async (tx) => {
      // Giao hàng tự động: lấy 1 đơn vị kho chưa bán (nếu có)
      const stock = await tx.productStock.findFirst({ where: { productId, isSold: false } });
      const o = await tx.order.create({
        data: {
          buyerId, productId, gemSpent: price, sellerEarned, platformFee: fee,
          status: 'COMPLETED', completedAt: new Date(),
          escrowStatus: price > 0 ? 'HELD' : 'RELEASED',
          escrowReleaseAt: price > 0 ? new Date(now + HOLD_DAYS * 864e5) : null,
          couponCode: appliedCode, downloadUrl: product.fileUrl,
          deliveredContent: stock?.content ?? null,
        },
      });
      if (stock) await tx.productStock.update({ where: { id: stock.id }, data: { isSold: true, soldOrderId: o.id } });
      await tx.product.update({ where: { id: productId }, data: { salesCount: { increment: 1 }, downloadCount: { increment: 1 } } });
      if (product.storefrontId) await tx.storefront.update({ where: { id: product.storefrontId }, data: { totalSales: { increment: 1 } } });
      return o;
    });

    return { ok: true, orderId: order.id, paid: price, downloadUrl: product.fileUrl, deliveredContent: order.deliveredContent, escrowReleaseAt: order.escrowReleaseAt };
  }

  // Giải ngân các đơn đã hết hạn giam (gọi lười khi seller xem thu nhập / admin)
  async releaseMatured(sellerId?: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        escrowStatus: 'HELD',
        escrowReleaseAt: { lte: new Date() },
        ...(sellerId ? { product: { sellerId } } : {}),
      },
      include: { product: { select: { sellerId: true, storefrontId: true } } },
    });
    for (const o of orders) {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: o.id }, data: { escrowStatus: 'RELEASED' } });
        if (o.sellerEarned > 0) {
          await this.gem.credit(o.product.sellerId, o.sellerEarned, 'EARN_SELL', o.id, 'Giải ngân bán hàng');
          if (o.product.storefrontId) await tx.storefront.update({ where: { id: o.product.storefrontId }, data: { totalRevenue: { increment: o.sellerEarned } } });
        }
      });
    }
    return orders.length;
  }

  // ──────────────────────────────────────────────
  // ĐƠN HÀNG (buyer / seller)
  // ──────────────────────────────────────────────
  async myPurchases(buyerId: string) {
    return this.prisma.order.findMany({
      where: { buyerId }, orderBy: { createdAt: 'desc' },
      include: { product: { select: { title: true, slug: true, thumbnailUrl: true } } },
    });
  }

  async sellerEarnings(userId: string) {
    await this.releaseMatured(userId);
    const store = await this.prisma.storefront.findUnique({ where: { ownerId: userId }, select: { id: true } });
    const orders = await this.prisma.order.findMany({
      where: { product: { sellerId: userId } },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { title: true } }, buyer: { select: { username: true } } },
    });
    const held = orders.filter((o) => o.escrowStatus === 'HELD').reduce((s, o) => s + o.sellerEarned, 0);
    const released = orders.filter((o) => o.escrowStatus === 'RELEASED').reduce((s, o) => s + o.sellerEarned, 0);
    return {
      hasStore: !!store, held, released, totalOrders: orders.length,
      orders: orders.map((o) => ({
        id: o.id, product: o.product.title, buyer: o.buyer.username, gemSpent: o.gemSpent,
        sellerEarned: o.sellerEarned, escrowStatus: o.escrowStatus, escrowReleaseAt: o.escrowReleaseAt, createdAt: o.createdAt,
      })),
    };
  }

  // ──────────────────────────────────────────────
  // ADMIN — quản lý toàn bộ chợ
  // ──────────────────────────────────────────────
  adminStorefronts(q?: string) {
    return this.prisma.storefront.findMany({
      where: q ? { name: { contains: q, mode: 'insensitive' } } : {},
      orderBy: { createdAt: 'desc' },
    });
  }
  async adminToggleStorefront(id: string, field: 'isVerified' | 'isActive') {
    const s = await this.prisma.storefront.findUnique({ where: { id } });
    if (!s) throw new NotFoundException();
    return this.prisma.storefront.update({ where: { id }, data: { [field]: !s[field] } });
  }

  adminProducts(q?: string) {
    return this.prisma.product.findMany({
      where: q ? { title: { contains: q, mode: 'insensitive' } } : {},
      orderBy: { createdAt: 'desc' }, take: 200,
      include: { seller: { select: { username: true } } },
    });
  }
  adminSetProductStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'DRAFT') {
    return this.prisma.product.update({ where: { id }, data: { status } });
  }

  async adminOrders(status?: string) {
    return this.prisma.order.findMany({
      where: status ? { escrowStatus: status } : {},
      orderBy: { createdAt: 'desc' }, take: 200,
      include: { product: { select: { title: true } }, buyer: { select: { username: true } } },
    });
  }
  async adminReleaseOrder(orderId: string) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId }, include: { product: { select: { sellerId: true, storefrontId: true } } } });
    if (!o || o.escrowStatus !== 'HELD') throw new BadRequestException('Đơn không ở trạng thái giam');
    await this.prisma.order.update({ where: { id: orderId }, data: { escrowStatus: 'RELEASED' } });
    if (o.sellerEarned > 0) await this.gem.credit(o.product.sellerId, o.sellerEarned, 'EARN_SELL', o.id, 'Admin giải ngân');
    return { ok: true };
  }
  async adminRefundOrder(orderId: string, reason?: string) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!o) throw new NotFoundException();
    if (o.escrowStatus === 'RELEASED') throw new BadRequestException('Đơn đã giải ngân, không thể hoàn');
    if (o.escrowStatus === 'REFUNDED') throw new BadRequestException('Đơn đã hoàn');
    if (o.gemSpent > 0) await this.gem.credit(o.buyerId, o.gemSpent, 'REFUND', o.id, reason || 'Hoàn tiền đơn hàng');
    await this.prisma.order.update({ where: { id: orderId }, data: { escrowStatus: 'REFUNDED', status: 'REFUNDED', refundedAt: new Date(), refundReason: reason } });
    return { ok: true };
  }

  adminTickets(status?: string) {
    return this.prisma.shopTicket.findMany({
      where: status ? { status } : {}, orderBy: { updatedAt: 'desc' }, take: 200,
      include: { storefront: { select: { name: true } } },
    });
  }
  adminCoupons() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { storefront: { select: { name: true } } } });
  }
  async adminStats() {
    const [stores, products, orders, held] = await Promise.all([
      this.prisma.storefront.count(),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.aggregate({ where: { escrowStatus: 'HELD' }, _sum: { sellerEarned: true } }),
    ]);
    return { stores, products, orders, heldGem: held._sum.sellerEarned ?? 0 };
  }
}
