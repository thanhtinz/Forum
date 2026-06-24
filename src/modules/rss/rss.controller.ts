import { Controller, Get, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@SkipThrottle()
@Controller()
export class RssController {
  constructor(private readonly prisma: PrismaService) {}

  private base() {
    return (process.env.SITE_URL || 'https://tramgenz.com').replace(/\/$/, '');
  }

  // ──────────────── RSS 2.0 ────────────────
  @Get('rss.xml')
  async rss(@Res() res: Response) {
    const base = this.base();

    const episodes = await this.prisma.episode.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, number: true, title: true, thumbnail: true, createdAt: true,
        media: { select: { title: true, coverUrl: true } },
      },
    });

    const items = episodes.map((ep) => {
      const name = `${ep.media.title} - Tập ${ep.number}${ep.title ? ` · ${ep.title}` : ''}`;
      const url = `${base}/anime/watch?ep=${ep.id}`;
      const thumb = ep.thumbnail || ep.media.coverUrl || '';
      return `
    <item>
      <title><![CDATA[${name}]]></title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(ep.createdAt).toUTCString()}</pubDate>
      <description><![CDATA[${name}]]></description>${thumb ? `\n      <enclosure url="${thumb}" type="image/jpeg" length="0"/>` : ''}
    </item>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Trạm GenZ — Tập phim mới nhất</title>
    <link>${base}</link>
    <description>Các tập hoạt hình mới nhất trên Trạm GenZ</description>
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
      { loc: `${base}/hoat-hinh`, priority: '0.9', changefreq: 'daily' },
      { loc: `${base}/truyen-tranh`, priority: '0.9', changefreq: 'daily' },
      { loc: `${base}/community`, priority: '0.7', changefreq: 'daily' },
      { loc: `${base}/gallery`, priority: '0.6', changefreq: 'daily' },
      { loc: `${base}/leaderboard`, priority: '0.6', changefreq: 'daily' },
      { loc: `${base}/giveaways`, priority: '0.6', changefreq: 'daily' },
      { loc: `${base}/scam`, priority: '0.5', changefreq: 'weekly' },
      { loc: `${base}/members`, priority: '0.5', changefreq: 'weekly' },
      { loc: `${base}/search`, priority: '0.4', changefreq: 'always' },
    ];

    const [animes, threads] = await Promise.all([
      this.prisma.mediaWork.findMany({
        where: { OR: [{ creatorId: null }, { publishStatus: 'PUBLISHED' }] },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.thread.findMany({
        where: { isHidden: false, isApproved: true },
        select: { slug: true, lastPostAt: true },
        orderBy: { lastPostAt: 'desc' },
        take: 5000,
      }),
    ]);

    const url = (loc: string, lastmod: string, changefreq: string, priority: string) =>
      `\n  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages.map(p => url(p.loc, today, p.changefreq, p.priority)).join('')}
${animes.map(a => url(`${base}/anime/detail?slug=${a.slug}`, a.updatedAt.toISOString().slice(0, 10), 'weekly', '0.8')).join('')}
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
