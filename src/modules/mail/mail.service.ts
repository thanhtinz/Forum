import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';

export interface MailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

const CONFIG_KEY = 'mail.config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getConfig(): Promise<MailConfig> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: CONFIG_KEY } }).catch(() => null);
    const v = (cfg?.value as any) || {};
    return {
      enabled: !!v.enabled,
      host: v.host || process.env.SMTP_HOST || '',
      port: Number(v.port || process.env.SMTP_PORT || 587),
      secure: v.secure ?? (Number(v.port || 587) === 465),
      user: v.user || process.env.SMTP_USER || '',
      pass: v.pass ?? (process.env.SMTP_PASS || ''),
      fromName: v.fromName || 'Forum',
      fromEmail: v.fromEmail || process.env.SMTP_FROM || v.user || '',
    };
  }

  async setConfig(dto: Partial<MailConfig>): Promise<MailConfig> {
    const cur = await this.getConfig();
    const next: MailConfig = {
      enabled: dto.enabled ?? cur.enabled,
      host: dto.host ?? cur.host,
      port: Number(dto.port ?? cur.port),
      secure: dto.secure ?? cur.secure,
      user: dto.user ?? cur.user,
      pass: dto.pass ?? cur.pass,
      fromName: dto.fromName ?? cur.fromName,
      fromEmail: dto.fromEmail ?? cur.fromEmail,
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
    return c.enabled && !!c.host && !!c.fromEmail;
  }

  /** Gửi email. Trả về true nếu gửi, false nếu chưa cấu hình (không ném lỗi để không chặn luồng chính). */
  async send(to: string, subject: string, html: string): Promise<boolean> {
    const c = await this.getConfig();
    if (!c.enabled || !c.host || !c.fromEmail) {
      this.logger.warn(`Email chưa cấu hình — bỏ qua gửi tới ${to} ("${subject}")`);
      return false;
    }
    try {
      const transporter = nodemailer.createTransport({
        host: c.host,
        port: c.port,
        secure: c.secure,
        auth: c.user ? { user: c.user, pass: c.pass } : undefined,
      });
      await transporter.sendMail({
        from: `"${c.fromName}" <${c.fromEmail}>`,
        to,
        subject,
        html,
      });
      return true;
    } catch (e: any) {
      this.logger.error(`Gửi email thất bại: ${e?.message || e}`);
      throw e;
    }
  }

  /** Bọc nội dung trong layout HTML đơn giản. */
  layout(title: string, body: string, actionUrl?: string, actionLabel?: string): string {
    const btn = actionUrl && actionLabel
      ? `<p style="margin:24px 0"><a href="${actionUrl}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${actionLabel}</a></p>
         <p style="color:#666;font-size:13px">Hoặc mở liên kết: <br><a href="${actionUrl}">${actionUrl}</a></p>`
      : '';
    return `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
      <h2 style="margin:0 0 12px">${title}</h2>
      <div style="font-size:15px;line-height:1.6">${body}</div>
      ${btn}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px">Email tự động từ diễn đàn. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>`;
  }
}
