import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GemService } from '../gem/gem.service';
import { AiProviderService, AiChatMessage } from '../ai-companion/ai-provider.service';
import { MarketplaceOrderService } from './marketplace-order.service';
import { SellerPerkService } from './seller-perk.service';

const AI_PROMPTS: Record<string, string> = {
  description: 'Bạn là copywriter bán hàng. Viết mô tả sản phẩm hấp dẫn, có gạch đầu dòng tính năng, kêu gọi mua hàng. Tiếng Việt, ngắn gọn.',
  seo: 'Bạn là chuyên gia SEO. Tạo tiêu đề SEO (<60 ký tự) và meta description (<160 ký tự) cho sản phẩm. Tiếng Việt.',
  reply: 'Bạn là nhân viên CSKH lịch sự, chuyên nghiệp. Soạn câu trả lời cho khách hàng. Tiếng Việt.',
  analyze: 'Bạn là chuyên gia phân tích kinh doanh. Phân tích số liệu doanh thu và đưa lời khuyên ngắn gọn. Tiếng Việt.',
};

// Xếp hạng seller theo tổng doanh thu (gem) đã giải ngân
function tierOf(revenue: number) {
  if (revenue >= 500000) return 'DIAMOND';
  if (revenue >= 100000) return 'PLATINUM';
  if (revenue >= 30000) return 'GOLD';
  if (revenue >= 5000) return 'SILVER';
  return 'BRONZE';
}

@Injectable()
export class SellerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gem: GemService,
    private readonly orders: MarketplaceOrderService,
    private readonly ai: AiProviderService,
    private readonly config: ConfigService,
    private readonly perks: SellerPerkService,
  ) {}

  // ── 18. Công cụ AI cho seller (cần mua gói AI) ──
  async aiAssist(userId: string, task: string, input: string) {
    const system = AI_PROMPTS[task];
    if (!system) throw new BadRequestException('Tác vụ AI không hợp lệ');
    if (!input?.trim()) throw new BadRequestException('Cần nhập nội dung');
    if (!(await this.perks.isAiActive(userId))) throw new ForbiddenException('Cần mua gói AI shop để dùng tính năng này');
    const provider = (this.config.get<string>('AI_PROVIDER') || 'GEMINI') as AiProvider;
    const model = this.config.get<string>('AI_MODEL') || 'gemini-1.5-flash';
    const messages: AiChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: input },
    ];
    let text = '';
    try {
      for await (const chunk of this.ai.streamChat(provider, model, messages)) text += chunk.text;
    } catch {
      throw new BadRequestException('Không gọi được AI (kiểm tra API key server)');
    }
    if (!text.trim()) throw new BadRequestException('AI không trả về nội dung (kiểm tra API key/model)');
    return { result: text };
  }

  private async store(userId: string) {
    const s = await this.prisma.storefront.findUnique({ where: { ownerId: userId } });
    if (!s) throw new BadRequestException('Bạn chưa có gian hàng');
    return s;
  }

  // Kiểm tra nhanh user đã có gian hàng chưa (cho header dropdown)
  async myStore(userId: string) {
    const s = await this.prisma.storefront.findUnique({ where: { ownerId: userId }, select: { slug: true } });
    return { hasStore: !!s, slug: s?.slug ?? null };
  }

  // ── 1. Dashboard tổng quan ──
  async dashboard(userId: string) {
    await this.orders.releaseMatured(userId);
    const store = await this.store(userId);
    const now = new Date();
    const startDay = new Date(now); startDay.setHours(0, 0, 0, 0);
    const startWeek = new Date(now.getTime() - 7 * 864e5);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const all = await this.prisma.order.findMany({
      where: { product: { sellerId: userId } },
      include: { product: { select: { title: true } } },
    });
    const rev = (from: Date) => all.filter((o) => o.escrowStatus !== 'REFUNDED' && o.createdAt >= from).reduce((s, o) => s + o.sellerEarned, 0);
    const balance = await this.gem.getBalance(userId);
    const held = all.filter((o) => o.escrowStatus === 'HELD').reduce((s, o) => s + o.sellerEarned, 0);

    // doanh thu 7 ngày cho biểu đồ
    const chart = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 864e5); d.setHours(0, 0, 0, 0);
      const next = new Date(d.getTime() + 864e5);
      const v = all.filter((o) => o.createdAt >= d && o.createdAt < next && o.escrowStatus !== 'REFUNDED').reduce((s, o) => s + o.sellerEarned, 0);
      return { date: `${d.getDate()}/${d.getMonth() + 1}`, revenue: v };
    });

    const best = await this.prisma.product.findMany({
      where: { sellerId: userId }, orderBy: { salesCount: 'desc' }, take: 5,
      select: { id: true, title: true, salesCount: true, viewCount: true, gemPrice: true },
    });
    const totalRevenue = all.filter((o) => o.escrowStatus === 'RELEASED').reduce((s, o) => s + o.sellerEarned, 0);

    return {
      tier: tierOf(store.totalRevenue), verified: store.isVerified,
      totalRevenue, revenueToday: rev(startDay), revenueWeek: rev(startWeek), revenueMonth: rev(startMonth),
      ordersNew: all.filter((o) => o.createdAt >= startDay).length,
      ordersCompleted: all.filter((o) => o.escrowStatus === 'RELEASED').length,
      ordersRefunded: all.filter((o) => o.escrowStatus === 'REFUNDED').length,
      available: balance, pending: held,
      chart, bestSellers: best,
    };
  }

  // ── 12. Thống kê nâng cao ──
  async analytics(userId: string) {
    const store = await this.store(userId);
    const products = await this.prisma.product.findMany({
      where: { sellerId: userId },
      select: { id: true, title: true, viewCount: true, salesCount: true, gemPrice: true, category: { select: { name: true } } },
    });
    const orders = await this.prisma.order.findMany({ where: { product: { sellerId: userId } }, select: { productId: true, sellerEarned: true, escrowStatus: true } });

    const totalOrders = orders.length;
    const refunded = orders.filter((o) => o.escrowStatus === 'REFUNDED').length;
    const totalViews = products.reduce((s, p) => s + p.viewCount, 0);
    const totalSales = products.reduce((s, p) => s + p.salesCount, 0);

    // doanh thu theo danh mục
    const byCat: Record<string, number> = {};
    const prodMap = new Map(products.map((p) => [p.id, p]));
    for (const o of orders) {
      if (o.escrowStatus === 'REFUNDED') continue;
      const cat = prodMap.get(o.productId)?.category?.name ?? 'Khác';
      byCat[cat] = (byCat[cat] ?? 0) + o.sellerEarned;
    }

    return {
      tier: store.totalRevenue,
      totalViews, totalSales,
      conversion: totalViews ? +((totalSales / totalViews) * 100).toFixed(2) : 0,
      refundRate: totalOrders ? +((refunded / totalOrders) * 100).toFixed(2) : 0,
      byCategory: Object.entries(byCat).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue),
      products: products.map((p) => ({
        title: p.title, views: p.viewCount, sales: p.salesCount,
        conversion: p.viewCount ? +((p.salesCount / p.viewCount) * 100).toFixed(2) : 0,
        revenue: p.salesCount * p.gemPrice,
      })).sort((a, b) => b.sales - a.sales),
    };
  }

  // ── 3. Kho hàng (giao tự động) ──
  async listStock(userId: string, productId: string) {
    await this.ownProduct(userId, productId);
    const [items, available] = await Promise.all([
      this.prisma.productStock.findMany({ where: { productId }, orderBy: { createdAt: 'desc' }, take: 200 }),
      this.prisma.productStock.count({ where: { productId, isSold: false } }),
    ]);
    return { available, items };
  }
  async addStock(userId: string, productId: string, lines: string[]) {
    await this.ownProduct(userId, productId);
    const data = lines.map((l) => l.trim()).filter(Boolean).map((content) => ({ productId, content }));
    if (!data.length) throw new BadRequestException('Chưa có dòng kho nào');
    await this.prisma.productStock.createMany({ data });
    return { ok: true, added: data.length };
  }
  async deleteStock(userId: string, stockId: string) {
    const st = await this.prisma.productStock.findUnique({ where: { id: stockId }, include: { product: { select: { sellerId: true } } } });
    if (!st || st.product.sellerId !== userId) throw new ForbiddenException();
    if (st.isSold) throw new BadRequestException('Không xóa được hàng đã bán');
    await this.prisma.productStock.delete({ where: { id: stockId } });
    return { ok: true };
  }

  // ── 7. Ví & tài chính ──
  async wallet(userId: string) {
    await this.orders.releaseMatured(userId);
    const [balance, tx, held] = await Promise.all([
      this.gem.getBalance(userId),
      this.prisma.gemTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.order.aggregate({ where: { product: { sellerId: userId }, escrowStatus: 'HELD' }, _sum: { sellerEarned: true } }),
    ]);
    return { available: balance, pending: held._sum.sellerEarned ?? 0, transactions: tx };
  }

  // ── 8. Rút tiền ──
  async payoutMethods(userId: string) {
    return this.prisma.payoutMethod.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
  async addPayoutMethod(userId: string, dto: { type: string; label: string; detail: string }) {
    return this.prisma.payoutMethod.create({ data: { userId, type: dto.type, label: dto.label, detail: dto.detail } });
  }
  async deletePayoutMethod(userId: string, id: string) {
    await this.prisma.payoutMethod.deleteMany({ where: { id, userId } });
    return { ok: true };
  }
  // % phí rút gem về bank (admin cấu hình; key withdrawal.feePercent)
  async getWithdrawFeePercent(): Promise<number> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'withdrawal.feePercent' } }).catch(() => null);
    const v = cfg?.value;
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v) : 0;
    return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 0;
  }

  async requestWithdrawal(userId: string, amount: number, methodId: string) {
    if (amount < 100) throw new BadRequestException('Số tiền rút tối thiểu 100 gem');
    const method = await this.prisma.payoutMethod.findFirst({ where: { id: methodId, userId } });
    if (!method) throw new BadRequestException('Phương thức nhận tiền không hợp lệ');
    const feePercent = await this.getWithdrawFeePercent();
    const feeAmount = Math.round((amount * feePercent) / 100);
    const netAmount = amount - feeAmount;
    // giữ tiền: trừ gem (gộp) ngay, hoàn nếu bị từ chối
    await this.gem.debit(userId, amount, 'ADMIN_ADJUST', undefined, `Yêu cầu rút tiền (phí ${feePercent}%)`);
    return this.prisma.withdrawal.create({
      data: { userId, amount, feePercent, feeAmount, netAmount, methodLabel: `${method.type} · ${method.label}` },
    });
  }
  async withdrawals(userId: string) {
    return this.prisma.withdrawal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }
  async setWithdrawFeePercent(percent: number) {
    const n = Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : 0;
    await this.prisma.siteConfig.upsert({
      where: { key: 'withdrawal.feePercent' },
      update: { value: n }, create: { key: 'withdrawal.feePercent', value: n },
    });
    return { feePercent: n };
  }

  // ── 11. Đánh giá ──
  async reviews(userId: string) {
    return this.prisma.productReview.findMany({
      where: { product: { sellerId: userId } }, orderBy: { createdAt: 'desc' }, take: 100,
      include: { product: { select: { title: true } } },
    });
  }
  async replyReview(userId: string, reviewId: string, reply: string) {
    const r = await this.prisma.productReview.findUnique({ where: { id: reviewId }, include: { product: { select: { sellerId: true } } } });
    if (!r || r.product.sellerId !== userId) throw new ForbiddenException();
    return this.prisma.productReview.update({ where: { id: reviewId }, data: { sellerReply: reply } });
  }

  // ── 2. Nhân bản sản phẩm ──
  async duplicateProduct(userId: string, productId: string) {
    const p = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!p || p.sellerId !== userId) throw new ForbiddenException();
    const { id, slug, createdAt, updatedAt, salesCount, downloadCount, viewCount, ratingAvg, ratingCount, ...rest } = p as any;
    return this.prisma.product.create({
      data: { ...rest, title: `${p.title} (copy)`, slug: `${slug}-copy-${Date.now().toString(36)}`, status: 'DRAFT' },
    });
  }

  private async ownProduct(userId: string, productId: string) {
    const p = await this.prisma.product.findUnique({ where: { id: productId }, select: { sellerId: true } });
    if (!p) throw new NotFoundException('Sản phẩm không tồn tại');
    if (p.sellerId !== userId) throw new ForbiddenException('Không phải sản phẩm của bạn');
  }
}
