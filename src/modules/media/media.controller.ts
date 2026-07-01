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
import { MediaService } from './media.service';
import { AttachmentService } from './attachment.service';
import { PresignUploadDto } from './media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

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

  // Upload ảnh — bắt buộc qua Cloudflare R2.
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
    return this.saveImage(file);
  }

  // Lưu ảnh: BẮT BUỘC qua R2. Trả { url, filename }.
  private async saveImage(file: any) {
    const r = await this.attachments.upload(file.buffer, file.originalname, file.mimetype, 'images');
    return { url: r.url, filename: r.filename };
  }

  // ── Tệp đính kèm (mọi loại file) lên R2 ──
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
