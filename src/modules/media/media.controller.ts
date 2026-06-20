import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createId } from '@paralleldrive/cuid2';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { MediaService } from './media.service';
import { AttachmentService } from './attachment.service';
import { PresignUploadDto } from './media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private readonly media: MediaService,
    private readonly attachments: AttachmentService,
  ) {}

  // Client gọi để lấy URL upload trực tiếp lên S3/MinIO
  @Post('presign')
  presign(@Body() dto: PresignUploadDto) {
    return this.media.presignUpload(dto);
  }

  // Upload ảnh: ưu tiên Cloudflare R2 (nếu đã cấu hình), không thì lưu local.
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          return cb(new BadRequestException('Chỉ chấp nhận ảnh PNG, JPEG, GIF hoặc WEBP'), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Không có file được tải lên');
    return this.saveImage(file);
  }

  // Upload ảnh cho trình soạn thảo — cũng qua R2 (rồi imagehost, rồi local).
  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
          return cb(new BadRequestException('Chỉ chấp nhận ảnh PNG, JPEG, GIF hoặc WEBP'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Không có file được tải lên');
    // Toàn bộ ảnh editor cũng đi qua R2 (fallback local) — thống nhất 1 kho lưu trữ.
    return this.saveImage(file);
  }

  // Lưu ảnh: R2 nếu đã bật, không thì lưu local. Luôn trả { url, filename }.
  private async saveImage(file: any) {
    if (await this.attachments.isEnabled()) {
      const r = await this.attachments.upload(file.buffer, file.originalname, file.mimetype, 'images');
      return { url: r.url, filename: r.filename };
    }
    if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });
    const ext = extname(file.originalname || '').toLowerCase() || '.png';
    const filename = `${createId()}${ext}`;
    writeFileSync(join(UPLOAD_DIR, filename), file.buffer);
    return { url: `/uploads/${filename}`, filename };
  }

  // ── Tệp đính kèm (mọi loại file) lên R2/S3, fallback local ──
  @Post('upload-attachment')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }),
  )
  async uploadAttachment(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Không có tệp được tải lên');
    return this.attachments.upload(file.buffer, file.originalname, file.mimetype);
  }

  @Get('admin/attachment')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getAttachmentConfig() {
    return this.attachments.getConfig();
  }

  @Post('admin/attachment')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  setAttachmentConfig(@Body() body: Record<string, any>) {
    return this.attachments.setConfig(body);
  }

}
