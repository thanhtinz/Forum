import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AttachmentService } from '../media/attachment.service';

// Tuỳ chọn hẹn giờ tự xoá ảnh
const EXPIRY_MS: Record<string, number | null> = {
  never: null,
  '5m': 5 * 60_000,
  '1h': 60 * 60_000,
  '6h': 6 * 60 * 60_000,
  '1d': 24 * 60 * 60_000,
  '1w': 7 * 24 * 60 * 60_000,
  '1m': 30 * 24 * 60 * 60_000,
};
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

@Injectable()
export class ImgHostService {
  private readonly logger = new Logger(ImgHostService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly attachments: AttachmentService,
  ) {}

  embeds(url: string, title?: string | null) {
    const alt = (title || 'image').replace(/"/g, '');
    return {
      direct: url,
      html: `<img src="${url}" alt="${alt}" border="0">`,
      htmlLink: `<a href="${url}"><img src="${url}" alt="${alt}" border="0"></a>`,
      bbcode: `[img]${url}[/img]`,
      bbcodeLink: `[url=${url}][img]${url}[/img][/url]`,
      markdown: `![${alt}](${url})`,
    };
  }

  async upload(userId: string, file: any, opts: { expiry?: string; albumId?: string; title?: string }) {
    if (!file) throw new BadRequestException('Không có ảnh được tải lên');
    if (!ALLOWED.has(file.mimetype)) throw new BadRequestException('Chỉ chấp nhận ảnh PNG, JPEG, GIF, WEBP');

    let albumId: string | null = null;
    if (opts.albumId) {
      const al = await this.prisma.galleryAlbum.findFirst({ where: { id: opts.albumId, ownerId: userId }, select: { id: true } });
      if (!al) throw new BadRequestException('Album không hợp lệ');
      albumId = al.id;
    }

    const { url, size } = await this.attachments.upload(file.buffer, file.originalname, file.mimetype, 'host');
    const ms = opts.expiry && opts.expiry in EXPIRY_MS ? EXPIRY_MS[opts.expiry] : null;
    const expiresAt = ms ? new Date(Date.now() + ms) : null;

    const img = await this.prisma.hostedImage.create({
      data: { ownerId: userId, url, size, albumId, expiresAt, title: opts.title?.slice(0, 200) || null },
    });
    return { ...img, embeds: this.embeds(img.url, img.title) };
  }

  async mine(userId: string, page = 1, albumId?: string) {
    const limit = 30;
    const where = { ownerId: userId, ...(albumId ? { albumId } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.hostedImage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.hostedImage.count({ where }),
    ]);
    return { data: data.map((i) => ({ ...i, embeds: this.embeds(i.url, i.title) })), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async remove(userId: string, id: string) {
    const img = await this.prisma.hostedImage.findUnique({ where: { id }, select: { ownerId: true } });
    if (!img || img.ownerId !== userId) throw new NotFoundException('Không tìm thấy ảnh');
    await this.prisma.hostedImage.delete({ where: { id } });
    return { ok: true };
  }

  async setAlbum(userId: string, id: string, albumId: string | null) {
    const img = await this.prisma.hostedImage.findUnique({ where: { id }, select: { ownerId: true } });
    if (!img || img.ownerId !== userId) throw new NotFoundException('Không tìm thấy ảnh');
    if (albumId) {
      const al = await this.prisma.galleryAlbum.findFirst({ where: { id: albumId, ownerId: userId }, select: { id: true } });
      if (!al) throw new BadRequestException('Album không hợp lệ');
    }
    await this.prisma.hostedImage.update({ where: { id }, data: { albumId } });
    return { ok: true };
  }

  // Dọn ảnh hết hạn mỗi giờ
  @Cron('0 0 * * * *')
  async cleanupExpired() {
    const res = await this.prisma.hostedImage.deleteMany({ where: { expiresAt: { not: null, lte: new Date() } } });
    if (res.count) this.logger.log(`Đã xoá ${res.count} ảnh hết hạn`);
  }
}
