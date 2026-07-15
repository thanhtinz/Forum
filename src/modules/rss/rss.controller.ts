import { Controller, Get, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@SkipThrottle()
@Controller()
export class RssController {
  constructor(private readonly prisma: PrismaService) {}

  private base() {
    return (process.env.SITE_URL || 'https://tramgenz.forum').replace(/\/$/, '');
  }

  // ──────────────── RSS 2.0 ────────────────
  @Get('rss.xml')
  async rss(@Res() res: Response) {
    const base = this.base();

    const threads = await this.prisma.thread.findMany({
      where: { isHidden: false, isApproved: true },
      orderBy: { lastPostAt: 'desc' },
      take: 50,
      select: { title: true, slug: true, lastPostAt: true, createdAt: true },
    });

    const items = threads.map((t) => {
      const url = `${base}/thread?slug=${t.slug}`;
      return `
    <item>
      <title><![CDATA[${t.title}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(t.createdAt).toUTCString()}</pubDate>
      <description><![CDATA[${t.title}]]></description>
    </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Trạm GenZ — Bài viết mới nhất</title>
    <link>${base}</link>
    <description>Các bài viết mới nhất trên Trạm GenZ</description>
    <language>vi</language>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(xml);
  }

  // ──────────────── Sitemap XML ────────────────
  @Get('sitemap.xml')
  async sitemap(@Res() res: Response) {
    const base = this.base();
    const today = new Date().toISOString().slice(0, 10);

    const staticPages = [
      { loc: base, priority: '1.0', changefreq: 'daily' },
      { loc: `${base}/community`, priority: '0.7', changefreq: 'daily' },
      { loc: `${base}/gallery`, priority: '0.6', changefreq: 'daily' },
      { loc: `${base}/leaderboard`, priority: '0.6', changefreq: 'daily' },
      { loc: `${base}/giveaways`, priority: '0.6', changefreq: 'daily' },
      { loc: `${base}/scam`, priority: '0.5', changefreq: 'weekly' },
      { loc: `${base}/members`, priority: '0.5', changefreq: 'weekly' },
      { loc: `${base}/search`, priority: '0.4', changefreq: 'always' },
    ];

    const threads = await this.prisma.thread.findMany({
      where: { isHidden: false, isApproved: true },
      select: { slug: true, lastPostAt: true },
      orderBy: { lastPostAt: 'desc' },
      take: 5000,
    });

    const url = (loc: string, lastmod: string, changefreq: string, priority: string) =>
      `\n  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => url(p.loc, today, p.changefreq, p.priority)).join('')}
${threads.map(t => url(`${base}/thread?slug=${t.slug}`, t.lastPostAt.toISOString().slice(0, 10), 'weekly', '0.7')).join('')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(xml);
  }

  // ──────────────── robots.txt ────────────────
  @Get('robots.txt')
  robots(@Res() res: Response) {
    const base = this.base();
    const txt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /settings
Disallow: /wallet
Disallow: /notifications

Sitemap: ${base}/sitemap.xml
`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(txt);
  }
}
