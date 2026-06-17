import { Module } from '@nestjs/common';
import { MediaService } from './media.service';
import { ImageHostService } from './image-host.service';
import { MediaController } from './media.controller';

@Module({
  providers: [MediaService, ImageHostService],
  controllers: [MediaController],
  exports: [MediaService, ImageHostService],
})
export class MediaModule {}
