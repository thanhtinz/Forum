import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BannerService {
  constructor(private readonly prisma: PrismaService) {}

  // Công khai: banner đang hiệu lực theo vị trí (đang bật + trong khoảng thời gian)
  async active(position: string) {
    const now = new Date();
    return this.prisma.adBanner.findMany({
      where: {
        position,
        isActive: true,
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ── Admin ──
  list() {
    return this.prisma.adBanner.findMany({ orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }] });
  }

  create(data: any) {
    if (!data?.title || !data?.imageUrl) throw new BadRequestException('Thiếu tiêu đề hoặc ảnh banner');
    return this.prisma.adBanner.create({
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        linkUrl: data.linkUrl || null,
        position: data.position || 'home_top',
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  update(id: string, data: any) {
    const patch: any = {};
    for (const k of ['title', 'imageUrl', 'linkUrl', 'position', 'isActive', 'sortOrder']) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    if (data.startAt !== undefined) patch.startAt = data.startAt ? new Date(data.startAt) : null;
    if (data.endAt !== undefined) patch.endAt = data.endAt ? new Date(data.endAt) : null;
    return this.prisma.adBanner.update({ where: { id }, data: patch });
  }

  remove(id: string) {
    return this.prisma.adBanner.delete({ where: { id } });
  }
}
