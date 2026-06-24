import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

// SEO: sitemap.xml, rss.xml, robots.txt (đặt ở gốc, ngoài /api).
@Controller()
export class SeoController {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  private base(): string {
    const raw = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return raw.split(',')[0].replace(/\/$/, '');
  }
  private esc(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private async siteName(): Promise<string> {
    const cfg = await this.prisma.siteConfig.findUnique({ where: { key: 'site.name' } }).catch(() => null);
    const v = cfg?.value;
    return (typeof v === 'string' && v.trim()) ? v : (process.env.SITE_NAME ?? 'Trạm GenZ');
  }

  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  robots(): string {
    return `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\n\nSitemap: ${this.base()}/sitemap.xml\n`;
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async sitemap(): Promise<string> {
    const base = this.base();
    const urls: { loc: string; lastmod?: string }[] = [
      { loc: `${base}/` },
      { loc: `${base}/members` },
      { loc: `${base}/tags` },
      { loc: `${base}/levels` },
    ];
    const [threads, cats, pages] = await Promise.all([
      this.prisma.thread.findMany({ where: { isApproved: true }, select: { slug: true, updatedAt: true }, orderBy: { lastPostAt: 'desc' }, take: 5000 }),
      this.prisma.category.findMany({ select: { slug: true } }),
      this.prisma.page.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }).catch(() => [] as any[]),
    ]);
    cats.forEach((c) => urls.push({ loc: `${base}/forum?category=${encodeURIComponent(c.slug)}` }));
    threads.forEach((t) => urls.push({ loc: `${base}/thread?slug=${encodeURIComponent(t.slug)}`, lastmod: t.updatedAt?.toISOString() }));
    (pages as any[]).forEach((p) => urls.push({ loc: `${base}/p?slug=${encodeURIComponent(p.slug)}`, lastmod: p.updatedAt?.toISOString?.() }));

    const body = urls.map((u) => `  <url><loc>${this.esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
  }

  @Get('rss.xml')
  @Header('Content-Type', 'application/rss+xml')
  async rss(): Promise<string> {
    const base = this.base();
    const name = await this.siteName();
    const threads = await this.prisma.thread.findMany({
      where: { isApproved: true },
      select: { title: true, slug: true, createdAt: true, author: { select: { username: true, displayName: true } }, category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 40,
    });
    const items = threads.map((t) => `    <item>
      <title>${this.esc(t.title)}</title>
      <link>${base}/thread?slug=${encodeURIComponent(t.slug)}</link>
      <guid isPermaLink="false">${this.esc(t.slug)}</guid>
      <dc:creator>${this.esc(t.author?.displayName || t.author?.username || '')}</dc:creator>
      ${t.category ? `<category>${this.esc(t.category.name)}</category>` : ''}
      <pubDate>${t.createdAt.toUTCString()}</pubDate>
    </item>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${this.esc(name)}</title>
    <link>${base}</link>
    <description>Bài viết mới nhất · ${this.esc(name)}</description>
    <language>vi</language>
${items}
  </channel>
</rss>`;
  }
}
