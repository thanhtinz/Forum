import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { AnimeService } from './anime.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller()
export class AnimeController {
  constructor(private readonly svc: AnimeService) {}

  // ── Công khai ──
  @Get('anime/genres')
  genres(@Query('type') type?: string) { return this.svc.listGenres(type); }

  // ── Admin quản lý thể loại ──
  @Post('admin/anime/genres')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createGenre(@Body() dto: { name: string; types: string[] }) { return this.svc.createGenre(dto.name, dto.types ?? []); }

  @Delete('admin/anime/genres/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteGenre(@Param('id') id: string) { return this.svc.deleteGenre(id); }

  // ── Danh sách cá nhân (đặt trước :slug để không bị nuốt route) ──
  @Get('anime/me/list')
  @UseGuards(JwtAuthGuard)
  myList(@CurrentUser('id') userId: string, @Query() q: any) { return this.svc.myList(userId, q); }

  @Get('anime/me/entry/:mediaId')
  @UseGuards(JwtAuthGuard)
  getEntry(@CurrentUser('id') userId: string, @Param('mediaId') mediaId: string) { return this.svc.getEntry(userId, mediaId); }

  @Put('anime/me/entry/:mediaId')
  @UseGuards(JwtAuthGuard)
  upsertEntry(@CurrentUser('id') userId: string, @Param('mediaId') mediaId: string, @Body() dto: any) { return this.svc.upsertEntry(userId, mediaId, dto); }

  @Delete('anime/me/entry/:mediaId')
  @UseGuards(JwtAuthGuard)
  removeEntry(@CurrentUser('id') userId: string, @Param('mediaId') mediaId: string) { return this.svc.removeEntry(userId, mediaId); }

  @Get('anime/hls')
  hls(@Query('u') u: string, @Query('r') r: string, @Query('debug') debug: string, @Headers('range') range: string, @Res() res: Response) {
    return this.svc.proxyHls(u, r, range, res, !!debug);
  }

  @Get('anime/episode/:id')
  episode(@Param('id') id: string) { return this.svc.getEpisode(id); }

  @Post('anime/episode/:id/comments')
  @UseGuards(JwtAuthGuard)
  addEpComment(@Param('id') id: string, @CurrentUser('id') userId: string, @Body('content') content: string, @Body('parentId') parentId?: string) {
    return this.svc.addEpisodeComment(id, userId, content, parentId || null);
  }

  @Delete('anime/comment/:id')
  @UseGuards(JwtAuthGuard)
  delEpComment(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: string) {
    return this.svc.deleteEpisodeComment(id, userId, role);
  }

  @Get('anime/chapter/:id')
  chapter(@Param('id') id: string) { return this.svc.getChapter(id); }

  @Get('anime')
  list(@Query() q: any) { return this.svc.list(q); }

  @Get('anime/:slug/comments')
  mediaComments(@Param('slug') slug: string) { return this.svc.getMediaComments(slug); }

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

  // Lấy đầy đủ để sửa (đặt sau các route admin/anime/* tĩnh)
  @Get('admin/anime/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getForEdit(@Param('id') id: string) { return this.svc.getForEdit(id); }

  // Tập phim (anime)
  @Post('admin/anime/:id/episode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  addEpisode(@Param('id') id: string, @Body() dto: any) { return this.svc.addEpisode(id, dto); }

  @Patch('admin/anime/episode/:epId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateEpisode(@Param('epId') epId: string, @Body() dto: any) { return this.svc.updateEpisode(epId, dto); }

  @Post('admin/anime/episode/:epId/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteEpisode(@Param('epId') epId: string) { return this.svc.deleteEpisode(epId); }

  // Server phụ cho tập
  @Post('admin/anime/episode/:epId/server')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  addServer(@Param('epId') epId: string, @Body() dto: any) { return this.svc.addServer(epId, dto); }

  @Patch('admin/anime/server/:sid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateServer(@Param('sid') sid: string, @Body() dto: any) { return this.svc.updateServer(sid, dto); }

  @Post('admin/anime/server/:sid/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteServer(@Param('sid') sid: string) { return this.svc.deleteServer(sid); }

  @Post('admin/anime/extract-embed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  extractEmbed(@Body('input') input: string) { return this.svc.extractEmbed(input); }

  // Chương (manga / light novel)
  @Post('admin/anime/:id/chapter')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  addChapter(@Param('id') id: string, @Body() dto: any) { return this.svc.addChapter(id, dto); }

  @Patch('admin/anime/chapter/:chId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateChapter(@Param('chId') chId: string, @Body() dto: any) { return this.svc.updateChapter(chId, dto); }

  @Post('admin/anime/chapter/:chId/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteChapter(@Param('chId') chId: string) { return this.svc.deleteChapter(chId); }
}
