import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CaptchaConfig {
  enabled: boolean;
  provider: 'turnstile' | 'hcaptcha' | 'recaptcha';
  siteKey: string;
  secretKey: string;
}

const CONFIG_KEY = 'captcha.config';
const VERIFY_URL: Record<string, string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  hcaptcha: 'https://api.hcaptcha.com/siteverify',
  recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
};

// Xác minh CAPTCHA (Cloudflare Turnstile / hCaptcha / reCAPTCHA) khi admin bật.
@Injectable()
export class CaptchaService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<CaptchaConfig> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: CONFIG_KEY } }).catch(() => null);
    const v = (cfg?.value as any) || {};
    return {
      enabled: !!v.enabled,
      provider: v.provider || 'turnstile',
      siteKey: v.siteKey || '',
      secretKey: v.secretKey || '',
    };
  }

  // Thông tin công khai cho frontend render widget (không lộ secret)
  async getPublic() {
    const c = await this.getConfig();
    return { enabled: c.enabled && !!c.siteKey && !!c.secretKey, provider: c.provider, siteKey: c.siteKey };
  }

  async setConfig(dto: Partial<CaptchaConfig>): Promise<CaptchaConfig> {
    const cur = await this.getConfig();
    const next: CaptchaConfig = {
      enabled: dto.enabled ?? cur.enabled,
      provider: (dto.provider as any) || cur.provider,
      siteKey: dto.siteKey ?? cur.siteKey,
      secretKey: dto.secretKey ?? cur.secretKey,
    };
    await this.prisma.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: next as any },
      create: { key: CONFIG_KEY, value: next as any },
    });
    return next;
  }

  async isEnabled(): Promise<boolean> {
    const c = await this.getConfig();
    return c.enabled && !!c.siteKey && !!c.secretKey;
  }

  /** Ném lỗi nếu captcha bật mà token không hợp lệ. Bỏ qua nếu chưa bật. */
  async assertValid(token: string | undefined, ip?: string): Promise<void> {
    const c = await this.getConfig();
    if (!c.enabled || !c.siteKey || !c.secretKey) return; // chưa bật → bỏ qua
    if (!token) throw new BadRequestException('Vui lòng xác minh CAPTCHA');
    const url = VERIFY_URL[c.provider] || VERIFY_URL.turnstile;
    const form = new URLSearchParams();
    form.append('secret', c.secretKey);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form.toString() });
      const data: any = await res.json();
      if (!data?.success) throw new BadRequestException('Xác minh CAPTCHA thất bại');
    } catch (e: any) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Không xác minh được CAPTCHA');
    }
  }
}
