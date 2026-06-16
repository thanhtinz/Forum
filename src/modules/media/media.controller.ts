import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { createId } from '@paralleldrive/cuid2';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { MediaService } from './media.service';
import { PresignUploadDto } from './media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  // Client gọi để lấy URL upload trực tiếp lên S3/MinIO
  @Post('presign')
  presign(@Body() dto: PresignUploadDto) {
    return this.media.presignUpload(dto);
  }

  // Upload ảnh trực tiếp lên server (lưu local) — chạy được ngay trên mọi VPS.
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          mkdirSync(UPLOAD_DIR, { recursive: true });
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase();
          cb(null, `${createId()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          return cb(
            new BadRequestException('Chỉ chấp nhận ảnh PNG, JPEG, GIF hoặc WEBP'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Không có file được tải lên');
    // Đảm bảo thư mục tồn tại (phòng trường hợp bị xoá runtime).
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    return { url: `/uploads/${file.filename}`, filename: file.filename };
  }
}
