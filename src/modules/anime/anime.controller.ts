import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AnimeService } from './anime.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/decorators/roles.decorator';

@Controller()
export class AnimeController {
  constructor(private readonly svc: AnimeService) {}

  // ── Công khai ──
  @Get('anime/genres')
  genres() { return this.svc.listGenres(); }

  @Get('anime')
  list(@Query() q: any) { return this.svc.list(q); }

  @Get('anime/:slug')
  detail(@Param('slug') slug: string) { return this.svc.getBySlug(slug); }

  // ── Admin ──
  @Get('admin/anime')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminList(@Query() q: any) { return this.svc.adminList(q); }

  @Post('admin/anime')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() data: any) { return this.svc.createWork(data); }

  @Patch('admin/anime/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() data: any) { return this.svc.updateWork(id, data); }

  @Post('admin/anime/:id/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) { return this.svc.deleteWork(id); }

  @Get('admin/anime/anilist/search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  searchAnilist(@Query('q') q: string, @Query('type') type: 'ANIME' | 'MANGA') {
    return this.svc.searchAnilist(q, type === 'MANGA' ? 'MANGA' : 'ANIME');
  }

  @Post('admin/anime/anilist/import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  importAnilist(@Body('anilistId') anilistId: number) {
    return this.svc.importFromAnilist(Number(anilistId));
  }
}
