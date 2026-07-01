import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PagesService, PageDto, NavLinkDto } from './pages.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/decorators/roles.decorator';

@Controller()
export class PagesController {
  constructor(private readonly pages: PagesService) {}

  // ── Public ──
  @Get('pages/:slug')
  getPage(@Param('slug') slug: string) {
    return this.pages.getPublished(slug);
  }

  @Get('nav/pages')
  navPages() {
    return this.pages.listNavPages();
  }

  @Get('nav/links')
  navLinks() {
    return this.pages.listActiveNavLinks();
  }

  // ── Admin: Pages ──
  @Get('admin/pages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  listPages() {
    return this.pages.listAllPages();
  }

  @Post('admin/pages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createPage(@Body() dto: PageDto) {
    return this.pages.createPage(dto);
  }

  @Patch('admin/pages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updatePage(@Param('id') id: string, @Body() dto: Partial<PageDto>) {
    return this.pages.updatePage(id, dto);
  }

  @Delete('admin/pages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deletePage(@Param('id') id: string) {
    return this.pages.deletePage(id);
  }

  // ── Admin: Nav Links ──
  @Get('admin/nav-links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  listNavLinks() {
    return this.pages.listAllNavLinks();
  }

  @Post('admin/nav-links')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createNavLink(@Body() dto: NavLinkDto) {
    return this.pages.createNavLink(dto);
  }

  @Patch('admin/nav-links/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateNavLink(@Param('id') id: string, @Body() dto: Partial<NavLinkDto>) {
    return this.pages.updateNavLink(id, dto);
  }

  @Delete('admin/nav-links/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteNavLink(@Param('id') id: string) {
    return this.pages.deleteNavLink(id);
  }
}
