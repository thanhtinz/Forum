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
import { diskStorage, memoryStorage } from 'multer';
import { createId } from '@paralleldrive/cuid2';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { MediaService } from './media.service';
import { ImageHostService } from './image-host.service';
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
    private readonly imageHost: ImageHostService,
    private readonly attachments: AttachmentService,
  ) {}

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

  // Upload ảnh cho trình soạn thảo: ưu tiên dịch vụ ngoài (zpic/anh.moe) nếu admin đã bật,
  // không thì lưu local. Dùng cho nút chèn ảnh trong editor.
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
    if (await this.imageHost.isEnabled()) {
      return this.imageHost.upload(file.buffer, file.originalname, file.mimetype);
    }
    // Fallback: lưu local
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

  // ── Admin: cấu hình dịch vụ lưu trữ ảnh ngoài ──
  @Get('admin/imagehost')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getImageHost() {
    return this.imageHost.getConfig();
  }

  @Post('admin/imagehost')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  setImageHost(@Body() body: { enabled?: boolean; endpoint?: string; apiKey?: string }) {
    return this.imageHost.setConfig(body);
  }
}
