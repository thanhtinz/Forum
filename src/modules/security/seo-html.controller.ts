import { Controller, Get, Header, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';

// Phục vụ các trang động (/thread, /profile, /tag, /p) với meta động
// (title + OpenGraph/description) để xem trước khi chia sẻ mạng xã hội.
// SPA vẫn hydrate bình thường sau đó.
@Controller()
export class SeoHtmlController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private dist() { return process.env.FRONTEND_DIST || join(process.cwd(), 'frontend', 'out'); }
  private base() { return (this.config.get<string>('FRONTEND_URL') || '').split(',')[0].replace(/\/$/, ''); }
  private esc(s: string) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  private readHtml(file: string): string | null {
    try { return readFileSync(join(this.dist(), file), 'utf8'); } catch { return null; }
  }
  // Chèn title + meta vào HTML tĩnh
  private inject(html: string, opts: { title: string; desc: string; url: string; type?: string; image?: string }): string {
    const title = this.esc(opts.title);
    const d = this.esc(opts.desc);
    const tags = `
    <title>${title}</title>
    <meta name="description" content="${d}" />
    <link rel="canonical" href="${opts.url}" />
    <meta property="og:type" content="${opts.type || 'website'}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:url" content="${opts.url}" />
    ${opts.image ? `<meta property="og:image" content="${this.esc(opts.image)}" />` : ''}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${d}" />`;
    return html.replace(/<title>.*?<\/title>/i, '').replace(/<\/head>/i, `${tags}\n</head>`);
  }

  @Get('thread')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async thread(@Query('slug') slug?: string): Promise<string> {
    const html = this.readHtml('thread.html');
    if (!html) return '<!doctype html><meta http-equiv="refresh" content="0;url=/">';
    if (!slug) return html;
    const t = await this.prisma.thread.findUnique({
      where: { slug },
      select: { title: true, isApproved: true, category: { select: { name: true } }, posts: { where: { isFirstPost: true }, select: { content: true }, take: 1 } },
    }).catch(() => null);
    if (!t || !t.isApproved) return html;
    const text = (t.posts[0]?.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const desc = text.slice(0, 180) || `Thảo luận trong ${t.category?.name || 'diễn đàn'}`;
    return this.inject(html, { title: t.title, desc, url: `${this.base()}/thread?slug=${encodeURIComponent(slug)}`, type: 'article' });
  }

  @Get('profile')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async profile(@Query('u') u?: string): Promise<string> {
    const html = this.readHtml('profile.html');
    if (!html) return '<!doctype html><meta http-equiv="refresh" content="0;url=/">';
    if (!u) return html;
    const user = await this.prisma.user.findUnique({
      where: { username: u },
      select: { username: true, displayName: true, bio: true, avatar: true, postCount: true, reputationScore: true },
    }).catch(() => null);
    if (!user) return html;
    const name = user.displayName || user.username;
    const desc = (user.bio || '').replace(/\s+/g, ' ').trim().slice(0, 180) || `${user.postCount} bài · ${user.reputationScore} uy tín`;
    return this.inject(html, { title: `${name} (@${user.username})`, desc, url: `${this.base()}/profile?u=${encodeURIComponent(u)}`, type: 'profile', image: user.avatar || undefined });
  }

  @Get('tag')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async tag(@Query('slug') slug?: string): Promise<string> {
    const html = this.readHtml('tag.html');
    if (!html) return '<!doctype html><meta http-equiv="refresh" content="0;url=/">';
    if (!slug) return html;
    const tag = await this.prisma.tag.findUnique({ where: { slug }, select: { name: true, usageCount: true } }).catch(() => null);
    if (!tag) return html;
    return this.inject(html, { title: `#${tag.name}`, desc: `Các chủ đề gắn thẻ #${tag.name} · ${tag.usageCount} bài`, url: `${this.base()}/tag?slug=${encodeURIComponent(slug)}` });
  }

  @Get('p')
  @Header('Content-Type', 'text/html; charset=utf-8')
  async page(@Query('slug') slug?: string): Promise<string> {
    const html = this.readHtml('p.html');
    if (!html) return '<!doctype html><meta http-equiv="refresh" content="0;url=/">';
    if (!slug) return html;
    const page = await this.prisma.page.findUnique({ where: { slug }, select: { title: true, content: true, isPublished: true } }).catch(() => null);
    if (!page || !page.isPublished) return html;
    const text = (page.content || '').replace(/<[^>]+>/g, ' ').replace(/[#*_>`]/g, '').replace(/\s+/g, ' ').trim();
    return this.inject(html, { title: page.title, desc: text.slice(0, 180), url: `${this.base()}/p?slug=${encodeURIComponent(slug)}` });
  }
}
