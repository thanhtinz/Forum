import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { marked } from 'marked';
import slugify from 'slugify';
import { createId } from '@paralleldrive/cuid2';

export interface PageDto {
  slug?: string;
  title: string;
  content: string;
  isPublished?: boolean;
  showInNav?: boolean;
  sortOrder?: number;
}

export interface NavLinkDto {
  label: string;
  url: string;
  icon?: string;
  openNewTab?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

// FoF Pages + FoF Links — CMS đơn giản do admin quản lý
@Injectable()
export class PagesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Pages (public) ──
  async getPublished(slug: string) {
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page || !page.isPublished) throw new NotFoundException('Trang không tồn tại');
    return { ...page, html: marked.parse(page.content) as string };
  }

  listNavPages() {
    return this.prisma.page.findMany({
      where: { isPublished: true, showInNav: true },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, title: true },
    });
  }

  listActiveNavLinks() {
    return this.prisma.navLink.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ── Pages (admin) ──
  listAllPages() {
    return this.prisma.page.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async createPage(dto: PageDto) {
    const slug = dto.slug?.trim() || (slugify(dto.title, { lower: true, strict: true, locale: 'vi' }) || createId().slice(0, 8));
    const exists = await this.prisma.page.findUnique({ where: { slug } });
    return this.prisma.page.create({
      data: {
        slug: exists ? `${slug}-${createId().slice(0, 5)}` : slug,
        title: dto.title, content: dto.content,
        isPublished: dto.isPublished ?? true,
        showInNav: dto.showInNav ?? false,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updatePage(id: string, dto: Partial<PageDto>) {
    await this.ensurePage(id);
    return this.prisma.page.update({
      where: { id },
      data: {
        title: dto.title, content: dto.content,
        isPublished: dto.isPublished, showInNav: dto.showInNav,
        sortOrder: dto.sortOrder, slug: dto.slug,
      },
    });
  }

  async deletePage(id: string) {
    await this.ensurePage(id);
    await this.prisma.page.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensurePage(id: string) {
    const p = await this.prisma.page.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Trang không tồn tại');
  }

  // ── Nav Links (admin) ──
  listAllNavLinks() {
    return this.prisma.navLink.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  createNavLink(dto: NavLinkDto) {
    return this.prisma.navLink.create({
      data: {
        label: dto.label, url: dto.url, icon: dto.icon,
        openNewTab: dto.openNewTab ?? false,
        sortOrder: dto.sortOrder ?? 0, isActive: dto.isActive ?? true,
      },
    });
  }

  updateNavLink(id: string, dto: Partial<NavLinkDto>) {
    return this.prisma.navLink.update({ where: { id }, data: dto });
  }

  async deleteNavLink(id: string) {
    await this.prisma.navLink.delete({ where: { id } });
    return { deleted: true };
  }
}
