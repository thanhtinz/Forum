import { Injectable, Logger } from '@nestjs/common';
import webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';

export interface PushConfig {
  enabled: boolean;
  publicKey: string;
  privateKey: string;
  subject: string; // mailto:... hoặc URL
}

const CONFIG_KEY = 'push.config';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<PushConfig> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: CONFIG_KEY } }).catch(() => null);
    const v = (cfg?.value as any) || {};
    return {
      enabled: !!v.enabled,
      publicKey: v.publicKey || '',
      privateKey: v.privateKey || '',
      subject: v.subject || 'mailto:admin@example.com',
    };
  }

  async getPublic() {
    const c = await this.getConfig();
    return { enabled: c.enabled && !!c.publicKey && !!c.privateKey, publicKey: c.publicKey };
  }

  async setConfig(dto: Partial<PushConfig>): Promise<PushConfig> {
    const cur = await this.getConfig();
    const next: PushConfig = {
      enabled: dto.enabled ?? cur.enabled,
      publicKey: dto.publicKey ?? cur.publicKey,
      privateKey: dto.privateKey ?? cur.privateKey,
      subject: dto.subject ?? cur.subject,
    };
    await this.prisma.siteConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: next as any },
      create: { key: CONFIG_KEY, value: next as any },
    });
    return next;
  }

  generateKeys() {
    return webpush.generateVAPIDKeys(); // { publicKey, privateKey }
  }

  async subscribe(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return { ok: false };
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    return { ok: true };
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { ok: true };
  }

  /** Gửi push tới mọi thiết bị của user. Tự xoá subscription hết hạn (410/404). */
  async sendToUser(userId: string, payload: { title: string; body?: string; link?: string }) {
    const cfg = await this.getConfig();
    if (!cfg.enabled || !cfg.publicKey || !cfg.privateKey) return;
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    const data = JSON.stringify({ title: payload.title, body: payload.body || '', link: payload.link || '/' });
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
      } catch (e: any) {
        if (e?.statusCode === 410 || e?.statusCode === 404) {
          await this.prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    }));
  }
}
