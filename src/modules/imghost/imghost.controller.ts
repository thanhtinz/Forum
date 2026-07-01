import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';
import { ImgHostService } from './imghost.service';

@Controller('img')
@UseGuards(JwtAuthGuard)
export class ImgHostController {
  constructor(private readonly img: ImgHostService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(@CurrentUser('id') uid: string, @UploadedFile() file: any, @Body() body: { expiry?: string; albumId?: string; title?: string }) {
    if (!file) throw new BadRequestException('Không có ảnh');
    return this.img.upload(uid, file, body || {});
  }

  @Get('mine')
  mine(@CurrentUser('id') uid: string, @Query('page') page = 1, @Query('albumId') albumId?: string) {
    return this.img.mine(uid, Number(page), albumId);
  }

  @Patch(':id/album')
  setAlbum(@CurrentUser('id') uid: string, @Param('id') id: string, @Body() body: { albumId?: string | null }) {
    return this.img.setAlbum(uid, id, body?.albumId ?? null);
  }

  @Delete(':id')
  remove(@CurrentUser('id') uid: string, @Param('id') id: string) {
    return this.img.remove(uid, id);
  }
}
