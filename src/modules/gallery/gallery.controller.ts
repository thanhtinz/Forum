import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  GalleryService,
  CreateAlbumDto,
  UpdateAlbumDto,
  AddMediaDto,
} from './gallery.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('gallery')
export class GalleryController {
  constructor(private readonly gallery: GalleryService) {}

  // ── Albums ──
  @Get('albums')
  listAlbums(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('ownerId') ownerId?: string,
  ) {
    return this.gallery.listAlbums({ page: Number(page), limit: Number(limit), ownerId });
  }

  @Get('albums/:id')
  getAlbum(@Param('id') id: string) {
    return this.gallery.getAlbum(id);
  }

  @Post('albums')
  @UseGuards(JwtAuthGuard)
  createAlbum(@CurrentUser('id') userId: string, @Body() dto: CreateAlbumDto) {
    return this.gallery.createAlbum(userId, dto);
  }

  @Patch('albums/:id')
  @UseGuards(JwtAuthGuard)
  updateAlbum(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: UpdateAlbumDto,
  ) {
    return this.gallery.updateAlbum(id, userId, role, dto);
  }

  @Delete('albums/:id')
  @UseGuards(JwtAuthGuard)
  deleteAlbum(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.gallery.deleteAlbum(id, userId, role);
  }

  @Post('albums/:id/media')
  @UseGuards(JwtAuthGuard)
  addMedia(
    @Param('id') albumId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: AddMediaDto,
  ) {
    return this.gallery.addMedia(albumId, userId, role, dto);
  }

  // ── Media ──
  @Get('media')
  listRecentMedia(@Query('page') page = 1, @Query('limit') limit = 24) {
    return this.gallery.listRecentMedia({ page: Number(page), limit: Number(limit) });
  }

  @Get('media/:id')
  getMedia(@Param('id') id: string) {
    return this.gallery.getMedia(id);
  }

  @Delete('media/:id')
  @UseGuards(JwtAuthGuard)
  deleteMedia(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.gallery.deleteMedia(id, userId, role);
  }

  @Post('media/:id/like')
  @UseGuards(JwtAuthGuard)
  likeMedia(@Param('id') id: string) {
    return this.gallery.likeMedia(id);
  }

  @Post('media/:id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @Param('id') mediaId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.gallery.addComment(mediaId, userId, content);
  }

  // ── Comments ──
  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  deleteComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.gallery.deleteComment(id, userId, role);
  }
}
