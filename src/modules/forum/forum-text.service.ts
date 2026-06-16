import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// Mentions (@user) + lọc từ cấm (FoF Filter) + trích @username để thông báo
@Injectable()
export class ForumTextService {
  constructor(private readonly prisma: PrismaService) {}

  private censorCache: { words: string[]; at: number } = { words: [], at: 0 };

  // Lấy danh sách từ cấm từ SiteConfig (cache 60s)
  private async getCensorWords(): Promise<string[]> {
    if (Date.now() - this.censorCache.at < 60_000) return this.censorCache.words;
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'forum.censor' } }).catch(() => null);
    let words: string[] = [];
    if (cfg?.value) {
      try { words = Array.isArray(cfg.value) ? (cfg.value as string[]) : JSON.parse(cfg.value as string); } catch { words = []; }
    }
    this.censorCache = { words: words.filter(Boolean), at: Date.now() };
    return this.censorCache.words;
  }

  // Admin: đọc danh sách từ cấm hiện tại (không cache)
  async getCensorList(): Promise<string[]> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'forum.censor' } }).catch(() => null);
    if (!cfg?.value) return [];
    try { return Array.isArray(cfg.value) ? (cfg.value as string[]) : JSON.parse(cfg.value as string); } catch { return []; }
  }

  // Admin: cập nhật danh sách từ cấm
  async setCensorList(words: string[]): Promise<string[]> {
    const clean = [...new Set((words || []).map((w) => String(w).trim()).filter(Boolean))];
    await this.prisma.siteConfig.upsert({
      where: { key: 'forum.censor' },
      update: { value: clean },
      create: { key: 'forum.censor', value: clean },
    });
    this.censorCache = { words: clean, at: Date.now() };
    return clean;
  }

  // Thay từ cấm bằng dấu *** (giữ độ dài)
  async censor(text: string): Promise<string> {
    const words = await this.getCensorWords();
    if (!words.length) return text;
    let out = text;
    for (const w of words) {
      const re = new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      out = out.replace(re, (m) => '*'.repeat(m.length));
    }
    return out;
  }

  // Trích các @username (a-z0-9_) duy nhất từ nội dung thô
  extractMentions(raw: string): string[] {
    const matches = raw.match(/@([a-zA-Z0-9_]{3,30})/g) || [];
    return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
  }

  // Chuyển @username thành link tới profile trong HTML đã render
  linkMentions(html: string, validUsernames: Map<string, string>): string {
    return html.replace(/@([a-zA-Z0-9_]{3,30})/g, (full, name) => {
      const display = validUsernames.get(name.toLowerCase());
      return display ? `<a class="mention" href="/u/${display}">@${display}</a>` : full;
    });
  }

  // Tìm user theo username (chỉ những tên thực sự tồn tại)
  async resolveMentionedUsers(usernames: string[], excludeUserId?: string) {
    if (!usernames.length) return [] as { id: string; username: string }[];
    const users = await this.prisma.user.findMany({
      where: { username: { in: usernames, mode: 'insensitive' } },
      select: { id: true, username: true },
    });
    return users.filter((u) => u.id !== excludeUserId);
  }
}
