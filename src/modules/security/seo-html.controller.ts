import { Controller, Get, Header, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

// Phục vụ /thread với meta động (title + OpenGraph/description theo chủ đề)
// để xem trước khi chia sẻ mạng xã hội. SPA vẫn hydrate bình thường sau đó.
@Controller()
export class SeoHtmlController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private dist() {
    return process.env.FRONTEND_DIST || join(process.cwd(), 'frontend', 'out');
  }
  private base() {
    return (this.config.get<string>('FRONTEND_URL') || '').split(',')[0].replace(/\/$/, '');
  }
  private esc(s: string) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  @Get('thread')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async thread(@Query('slug') slug?: string): Promise<string> {
    let html: string;
    try {
      html = readFileSync(join(this.dist(), 'thread.html'), 'utf8');
    } catch {
      return '<!doctype html><meta http-equiv="refresh" content="0;url=/"><title>Đang chuyển hướng…</title>';
    }
    if (!slug) return html;

    const thread = await this.prisma.thread.findUnique({
      where: { slug },
      select: {
        title: true, isApproved: true,
        category: { select: { name: true } },
        author: { select: { username: true, displayName: true } },
        posts: { where: { isFirstPost: true }, select: { content: true }, take: 1 },
      },
    }).catch(() => null);
    if (!thread || !thread.isApproved) return html;

    const text = (thread.posts[0]?.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const desc = text.slice(0, 180) || `Thảo luận trong ${thread.category?.name || 'diễn đàn'}`;
    const author = thread.author?.displayName || thread.author?.username || '';
    const url = `${this.base()}/thread?slug=${encodeURIComponent(slug)}`;
    const title = this.esc(thread.title);
    const d = this.esc(desc);

    const tags = `
    <title>${title}</title>
    <meta name="description" content="${d}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:url" content="${url}" />
    ${author ? `<meta property="article:author" content="${this.esc(author)}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${d}" />`;

    // Bỏ <title> mặc định rồi chèn meta động vào cuối <head>
    let out = html.replace(/<title>.*?<\/title>/i, '');
    out = out.replace(/<\/head>/i, `${tags}\n</head>`);
    return out;
  }
}
