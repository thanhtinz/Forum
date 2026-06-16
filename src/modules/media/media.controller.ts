import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import { PresignUploadDto } from './media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  // Client gọi để lấy URL upload trực tiếp lên S3/MinIO
  @Post('presign')
  presign(@Body() dto: PresignUploadDto) {
    return this.media.presignUpload(dto);
  }
}
