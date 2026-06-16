import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ToolsService {
  constructor(private readonly prisma: PrismaService) {}

  // Danh sách nhóm + công cụ (cho trang tools)
  async list() {
    const categories = await this.prisma.toolCategory.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        tools: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    return categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      description: c.description,
      icon: c.icon,
      tools: c.tools.map((t) => ({
        slug: t.slug,
        name: t.name,
        description: t.description,
        icon: t.icon,
        component: t.component,
        isPro: t.isPro,
        usageCount: t.usageCount,
      })),
    }));
  }

  async getBySlug(slug: string) {
    const tool = await this.prisma.tool.findUnique({
      where: { slug },
      include: { category: { select: { slug: true, name: true } } },
    });
    if (!tool || !tool.isActive) throw new NotFoundException('Công cụ không tồn tại');
    return tool;
  }

  // Tăng lượt dùng (gọi khi mở công cụ)
  async use(slug: string) {
    const tool = await this.prisma.tool.findUnique({ where: { slug }, select: { id: true } });
    if (!tool) throw new NotFoundException('Công cụ không tồn tại');
    await this.prisma.tool.update({ where: { id: tool.id }, data: { usageCount: { increment: 1 } } });
    return { ok: true };
  }

  // Top công cụ dùng nhiều
  async popular(limit = 10) {
    const tools = await this.prisma.tool.findMany({
      where: { isActive: true },
      orderBy: { usageCount: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      select: { slug: true, name: true, icon: true, usageCount: true },
    });
    return tools;
  }

  // ── ADMIN ──
  async adminListAll() {
    return this.prisma.toolCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { tools: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async createTool(data: {
    categoryId: string; slug: string; name: string; description: string;
    icon?: string; component: string; isPro?: boolean; sortOrder?: number;
  }) {
    return this.prisma.tool.create({ data: { ...data, isPro: data.isPro ?? false, sortOrder: data.sortOrder ?? 0 } });
  }

  async updateTool(id: string, data: Partial<{ name: string; description: string; icon: string; component: string; isPro: boolean; isActive: boolean; sortOrder: number; categoryId: string }>) {
    return this.prisma.tool.update({ where: { id }, data });
  }

  async deleteTool(id: string) {
    await this.prisma.tool.delete({ where: { id } });
    return { ok: true };
  }

  async createCategory(data: { slug: string; name: string; description?: string; icon?: string; sortOrder?: number }) {
    return this.prisma.toolCategory.create({ data: { ...data, sortOrder: data.sortOrder ?? 0 } });
  }
}
