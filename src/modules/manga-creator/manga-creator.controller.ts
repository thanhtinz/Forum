import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  CurrentUser,
  Roles,
  RolesGuard,
} from '../../common/decorators/roles.decorator';
import { MangaCreatorService } from './manga-creator.service';

@Controller('creator')
@UseGuards(JwtAuthGuard)
export class MangaCreatorController {
  constructor(private readonly svc: MangaCreatorService) {}

  // ── Creator Registration ───────────────────────────────────────────────────

  @Get('apply/status')
  getApplicationStatus(@CurrentUser('id') userId: string) {
    return this.svc.getMyApplicationStatus(userId);
  }

  @Post('apply')
  submitApplication(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.svc.submitApplication(userId, dto);
  }

  // ── Series ────────────────────────────────────────────────────────────────

  @Get('manga')
  listMySeries(@CurrentUser('id') userId: string) {
    return this.svc.listMySeries(userId);
  }

  @Get('manga/:id')
  getSeries(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.getSeries(id, userId);
  }

  @Post('manga')
  createSeries(@CurrentUser('id') userId: string, @Body() dto: any) {
    return this.svc.createSeries(userId, dto);
  }

  @Patch('manga/:id')
  updateSeries(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.svc.updateSeries(id, userId, dto);
  }

  @Post('manga/:id/cover')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadCover(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: any,
  ) {
    return this.svc.uploadCover(id, userId, file);
  }

  @Post('manga/:id/submit')
  submitForReview(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.submitForReview(id, userId);
  }

  @Post('manga/:id/visibility')
  toggleVisibility(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.toggleVisibility(id, userId);
  }

  @Get('manga/:id/stats')
  getStats(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.getCreatorStats(id, userId);
  }

  @Delete('manga/:id')
  deleteSeries(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.deleteSeries(id, userId);
  }

  // ── Chapters ──────────────────────────────────────────────────────────────

  @Get('manga/:id/chapters')
  listChapters(
    @Param('id') mediaId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.listChapters(mediaId, userId);
  }

  @Post('manga/:id/chapters')
  createChapter(
    @Param('id') mediaId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.svc.createChapter(mediaId, userId, dto);
  }

  @Get('chapter/:id')
  getChapter(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.svc.getChapter(id, userId);
  }

  @Patch('chapter/:id')
  updateChapter(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.svc.updateChapter(id, userId, dto);
  }

  @Delete('chapter/:id')
  deleteChapter(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.deleteChapter(id, userId);
  }

  @Post('chapter/:id/pages')
  @UseInterceptors(
    FilesInterceptor('files', 500, {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadPages(
    @Param('id') chapterId: string,
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: any[],
  ) {
    return this.svc.uploadPages(chapterId, userId, files);
  }

  @Post('chapter/:id/pages/order')
  setPageOrder(
    @Param('id') chapterId: string,
    @CurrentUser('id') userId: string,
    @Body('pages') pages: string[],
  ) {
    return this.svc.setPageOrder(chapterId, userId, pages);
  }

  @Post('chapter/:id/publish')
  publishChapter(
    @Param('id') chapterId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.svc.publishChapter(chapterId, userId);
  }

  // ── Admin moderation ──────────────────────────────────────────────────────

  @Get('admin/applications')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listApplications() {
    return this.svc.listPendingApplications();
  }

  @Post('admin/applications/:id/moderate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  moderateApplication(
    @Param('id') id: string,
    @Body('action') action: 'approve' | 'reject',
    @Body('adminNote') adminNote?: string,
  ) {
    return this.svc.moderateApplication(id, action, adminNote);
  }

  @Get('admin/pending-series')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listPendingSeries() {
    return this.svc.listPendingSeries();
  }

  @Post('admin/series/:id/moderate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  moderateSeries(
    @Param('id') id: string,
    @Body('action') action: 'approve' | 'reject',
    @Body('adminNote') adminNote?: string,
  ) {
    return this.svc.moderateSeries(id, action, adminNote);
  }

  @Get('admin/pending-chapters')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listPendingChapters() {
    return this.svc.listPendingChapters();
  }

  @Post('admin/chapter/:id/moderate')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  moderateChapter(
    @Param('id') id: string,
    @Body('action') action: 'approve' | 'reject',
  ) {
    return this.svc.moderateChapter(id, action);
  }
}
