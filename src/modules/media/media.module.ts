import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { ImageHostService } from './image-host.service';
import { AttachmentService } from './attachment.service';
import { MediaController } from './media.controller';

@Module({
  providers: [MediaService, ImageHostService, AttachmentService],
  controllers: [MediaController],
  exports: [MediaService, ImageHostService, AttachmentService],
})
export class MediaModule {}
