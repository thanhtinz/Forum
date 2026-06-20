import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ToolEngineService } from './tool-engine.service';

@Injectable()
export class ToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ToolEngineService,
  ) {}

  // Chạy tool ở server (engine pure/AI). Lưu lịch sử nếu đăng nhập.
  async run(slug: string, input: string, userId?: string) {
    const tool = await this.prisma.tool.findUnique({
      where: { slug }, select: { id: true, name: true, serverEngine: true, isActive: true },
    });
    if (!tool || !tool.isActive) throw new NotFoundException('Công cụ không tồn tại');
    if (!tool.serverEngine || !this.engine.isServerEngine(tool.serverEngine)) {
      throw new BadRequestException('Công cụ này chạy trên trình duyệt');
    }
    const output = await this.engine.run(tool.serverEngine, input);
    await this.prisma.tool.update({ where: { id: tool.id }, data: { usageCount: { increment: 1 } } });
    if (userId) {
      await this.prisma.toolRun.create({
        data: { userId, toolSlug: slug, toolName: tool.name, input: (input || '').slice(0, 10000), output: output.slice(0, 20000) },
      }).catch(() => {});
    }
    return { output };
  }

  async history(userId: string, limit = 30) {
    return this.prisma.toolRun.findMany({
      where: { userId }, orderBy: { createdAt: 'desc' }, take: Math.min(limit, 100),
      select: { id: true, toolSlug: true, toolName: true, input: true, output: true, createdAt: true },
    });
  }

  async clearHistory(userId: string) {
    await this.prisma.toolRun.deleteMany({ where: { userId } });
    return { ok: true };
  }

  async favorites(userId: string) {
    const favs = await this.prisma.toolFavorite.findMany({ where: { userId }, select: { toolSlug: true } });
    const slugs = favs.map((f) => f.toolSlug);
    if (!slugs.length) return [];
    return this.prisma.tool.findMany({
      where: { slug: { in: slugs }, isActive: true },
      select: { slug: true, name: true, description: true, icon: true, isPro: true, usageCount: true },
    });
  }

  async toggleFavorite(userId: string, slug: string) {
    const existing = await this.prisma.toolFavorite.findUnique({ where: { userId_toolSlug: { userId, toolSlug: slug } } });
    if (existing) { await this.prisma.toolFavorite.delete({ where: { id: existing.id } }); return { favorited: false }; }
    await this.prisma.toolFavorite.create({ data: { userId, toolSlug: slug } });
    return { favorited: true };
  }

  async isFavorite(userId: string, slug: string) {
    const f = await this.prisma.toolFavorite.findUnique({ where: { userId_toolSlug: { userId, toolSlug: slug } }, select: { id: true } });
    return { favorited: !!f };
  }

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
