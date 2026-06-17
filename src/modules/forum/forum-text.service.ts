import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import sanitizeHtml from 'sanitize-html';

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

  // Làm sạch HTML từ trình soạn thảo TipTap (whitelist chống XSS).
  sanitizeRichHtml(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: [
        'p', 'br', 'hr', 'span', 'div', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
        'a', 'img',
        'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'details', 'summary', 'iframe', 'input', 'label',
      ],
      allowedAttributes: {
        a: ['href', 'target', 'rel', 'title'],
        img: ['src', 'alt', 'title', 'width', 'height'],
        span: ['style', 'data-type', 'data-id', 'class'],
        div: ['style', 'class', 'data-type'],
        p: ['style'],
        h1: ['style'], h2: ['style'], h3: ['style'], h4: ['style'], h5: ['style'], h6: ['style'],
        td: ['style', 'colspan', 'rowspan'], th: ['style', 'colspan', 'rowspan'],
        li: ['data-type', 'data-checked', 'class'],
        ul: ['data-type', 'class'],
        input: ['type', 'checked', 'disabled'],
        code: ['class'], pre: ['class'],
        iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder'],
        details: ['class'], summary: ['class'],
      },
      allowedStyles: {
        '*': {
          color: [/^#(0x)?[0-9a-fA-F]{3,8}$/, /^rgba?\(/, /^[a-zA-Z]+$/],
          'background-color': [/^#(0x)?[0-9a-fA-F]{3,8}$/, /^rgba?\(/, /^[a-zA-Z]+$/],
          'text-align': [/^(left|right|center|justify)$/],
          'font-size': [/^\d{1,3}(px|pt|em|rem|%)$/],
        },
      },
      allowedSchemes: ['http', 'https', 'mailto', 'data'],
      // Chỉ cho nhúng iframe từ YouTube/TikTok
      allowedIframeHostnames: ['www.youtube.com', 'youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'player.vimeo.com', 'www.tiktok.com'],
      transformTags: {
        a: (tagName, attribs) => ({
          tagName: 'a',
          attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer nofollow' },
        }),
      },
    });
  }

  // Lọc từ cấm trên HTML: chỉ thay ở phần text, không đụng vào thẻ.
  async censorHtml(html: string): Promise<string> {
    const words = await this.getCensorWords();
    if (!words.length) return html;
    const res = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const re = new RegExp(res, 'gi');
    // tách theo thẻ, chỉ censor ngoài thẻ
    return html.replace(/>([^<]+)</g, (_m, text) => '>' + text.replace(re, (x: string) => '*'.repeat(x.length)) + '<');
  }

  // Chuyển BBCode phổ biến sang HTML (whitelist an toàn) — chạy trước markdown.
  applyBBCode(text: string): string {
    let s = text;
    const esc = (u: string) => String(u).replace(/"/g, '%22').replace(/\s/g, '');
    for (let i = 0; i < 4; i++) {
      s = s
        .replace(/\[b\]([\s\S]*?)\[\/b\]/gi, '<strong>$1</strong>')
        .replace(/\[i\]([\s\S]*?)\[\/i\]/gi, '<em>$1</em>')
        .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
        .replace(/\[s\]([\s\S]*?)\[\/s\]/gi, '<s>$1</s>')
        .replace(/\[center\]([\s\S]*?)\[\/center\]/gi, '<div style="text-align:center">$1</div>')
        .replace(/\[quote(?:=[^\]]+)?\]([\s\S]*?)\[\/quote\]/gi, '<blockquote>$1</blockquote>')
        .replace(/\[code\]([\s\S]*?)\[\/code\]/gi, '<pre><code>$1</code></pre>')
        .replace(/\[color=(#?[a-zA-Z0-9]+)\]([\s\S]*?)\[\/color\]/gi, '<span style="color:$1">$2</span>')
        .replace(/\[size=(\d{1,3})\]([\s\S]*?)\[\/size\]/gi, (_m, n, c) => `<span style="font-size:${Math.min(Math.max(+n, 8), 48)}px">${c}</span>`)
        .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (_m, u, t) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${t}</a>`)
        .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, (_m, u) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${u}</a>`)
        .replace(/\[img\]([\s\S]*?)\[\/img\]/gi, (_m, u) => `<img src="${esc(u)}" alt="" style="max-width:100%" />`)
        .replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_m, c) => `<ul>${String(c).replace(/\[\*\]\s?([^\[\n]*)/gi, '<li>$1</li>')}</ul>`);
    }
    return s;
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
