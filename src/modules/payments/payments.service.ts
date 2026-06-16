import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GemService } from '../gem/gem.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gem: GemService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────
  // SEPAY: tạo yêu cầu nạp + sinh nội dung chuyển khoản
  // ──────────────────────────────────────────────
  async createSepayTopup(userId: string, packageId: string) {
    const pkg = await this.prisma.gemPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.priceVnd) throw new BadRequestException('Gói nạp không hợp lệ');

    const totalGem = pkg.gemAmount + pkg.bonus;

    // Mã giao dịch unique để đối soát webhook
    const ref = `GEM${userId.slice(0, 8)}${Date.now().toString(36)}`.toUpperCase();

    const topup = await this.prisma.paymentTopup.create({
      data: {
        userId,
        provider: 'sepay',
        providerRef: ref,
        amountVnd: pkg.priceVnd,
        gemAwarded: totalGem,
        status: 'pending',
      },
    });

    // Thông tin chuyển khoản hiển thị cho user
    const bankAccount = this.config.get('SEPAY_BANK_ACCOUNT');
    const bankName = this.config.get('SEPAY_BANK_NAME');
    const accountName = this.config.get('SEPAY_ACCOUNT_NAME');

    return {
      topupId: topup.id,
      ref,
      amountVnd: pkg.priceVnd,
      gemAwarded: totalGem,
      transferContent: ref, // user nhập đúng nội dung này khi CK
      bankAccount,
      bankName,
      accountName,
      qrCode: this.buildSepayQrUrl(bankAccount, bankName, pkg.priceVnd, ref),
    };
  }

  // ──────────────────────────────────────────────
  // SEPAY WEBHOOK: nhận thông báo CK thành công
  // ──────────────────────────────────────────────
  async handleSepayWebhook(payload: any, apiKey: string) {
    // Verify API key
    const expectedKey = this.config.get('SEPAY_WEBHOOK_API_KEY');
    if (apiKey !== expectedKey) {
      throw new BadRequestException('API key không hợp lệ');
    }

    // SePay gửi: { content, transferAmount, transferType, ... }
    const content: string = payload.content ?? payload.description ?? '';
    const amount: number = payload.transferAmount ?? 0;

    // Tìm mã ref trong nội dung CK
    const refMatch = content.match(/GEM[A-Z0-9]+/);
    if (!refMatch) {
      this.logger.warn(`Webhook không tìm thấy mã ref: ${content}`);
      return { success: false, reason: 'no_ref' };
    }
    const ref = refMatch[0];

    const topup = await this.prisma.paymentTopup.findFirst({
      where: { providerRef: ref, status: 'pending' },
    });
    if (!topup) {
      this.logger.warn(`Topup không tồn tại hoặc đã xử lý: ${ref}`);
      return { success: false, reason: 'topup_not_found' };
    }

    // Verify số tiền
    if (topup.amountVnd && amount < topup.amountVnd) {
      this.logger.warn(`Số tiền không đủ: ${amount} < ${topup.amountVnd}`);
      return { success: false, reason: 'amount_mismatch' };
    }

    // Cộng gem + cập nhật trạng thái
    await this.prisma.paymentTopup.update({
      where: { id: topup.id },
      data: { status: 'completed', confirmedAt: new Date(), webhookData: payload },
    });

    await this.gem.credit(
      topup.userId,
      topup.gemAwarded,
      'TOPUP_SEPAY',
      topup.id,
      `Nạp ${topup.gemAwarded} Gem qua SePay`,
    );

    await this.notifications.notify(topup.userId, {
      type: 'GEM_RECEIVED',
      title: 'Nạp Gem thành công',
      body: `+${topup.gemAwarded} Gem đã được cộng vào tài khoản`,
      link: '/wallet',
    });

    this.logger.log(`SePay topup completed: ${ref} +${topup.gemAwarded} gem`);
    return { success: true };
  }

  // ──────────────────────────────────────────────
  // PAYPAL: tạo order
  // ──────────────────────────────────────────────
  async createPaypalOrder(userId: string, packageId: string) {
    const pkg = await this.prisma.gemPackage.findUnique({ where: { id: packageId } });
    if (!pkg || !pkg.priceUsd) throw new BadRequestException('Gói nạp không hợp lệ');

    const accessToken = await this.getPaypalAccessToken();
    const totalGem = pkg.gemAmount + pkg.bonus;

    const topup = await this.prisma.paymentTopup.create({
      data: {
        userId,
        provider: 'paypal',
        amountUsd: pkg.priceUsd,
        gemAwarded: totalGem,
        status: 'pending',
      },
    });

    const res = await fetch(`${this.getPaypalBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: topup.id,
            amount: { currency_code: 'USD', value: pkg.priceUsd.toFixed(2) },
            description: `${totalGem} Gem`,
          },
        ],
      }),
    });

    const order = await res.json();
    if (!order.id) throw new BadRequestException('Không thể tạo PayPal order');

    await this.prisma.paymentTopup.update({
      where: { id: topup.id },
      data: { providerRef: order.id },
    });

    return { topupId: topup.id, orderId: order.id, gemAwarded: totalGem };
  }

  // ──────────────────────────────────────────────
  // PAYPAL: capture order sau khi user approve
  // ──────────────────────────────────────────────
  async capturePaypalOrder(orderId: string) {
    const accessToken = await this.getPaypalAccessToken();

    const res = await fetch(
      `${this.getPaypalBase()}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const result = await res.json();

    if (result.status !== 'COMPLETED') {
      throw new BadRequestException('Thanh toán PayPal chưa hoàn tất');
    }

    const topup = await this.prisma.paymentTopup.findFirst({
      where: { providerRef: orderId, status: 'pending' },
    });
    if (!topup) throw new NotFoundException('Topup không tồn tại');

    await this.prisma.paymentTopup.update({
      where: { id: topup.id },
      data: { status: 'completed', confirmedAt: new Date(), webhookData: result },
    });

    await this.gem.credit(
      topup.userId,
      topup.gemAwarded,
      'TOPUP_PAYPAL',
      topup.id,
      `Nạp ${topup.gemAwarded} Gem qua PayPal`,
    );

    await this.notifications.notify(topup.userId, {
      type: 'GEM_RECEIVED',
      title: 'Nạp Gem thành công',
      body: `+${topup.gemAwarded} Gem đã được cộng vào tài khoản`,
      link: '/wallet',
    });

    return { success: true, gemAwarded: topup.gemAwarded };
  }

  // ──────────────────────────────────────────────
  // PAYPAL HELPERS
  // ──────────────────────────────────────────────
  private getPaypalBase(): string {
    return this.config.get('PAYPAL_MODE') === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  private async getPaypalAccessToken(): Promise<string> {
    const clientId = this.config.get('PAYPAL_CLIENT_ID');
    const secret = this.config.get('PAYPAL_SECRET');
    const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

    const res = await fetch(`${this.getPaypalBase()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    return data.access_token;
  }

  private buildSepayQrUrl(account: string, bank: string, amount: number, content: string): string {
    // SePay QR API
    return `https://qr.sepay.vn/img?acc=${account}&bank=${bank}&amount=${amount}&des=${encodeURIComponent(content)}`;
  }
}
