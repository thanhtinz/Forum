import { Module } from '@nestjs/common';
import { ImgHostService } from './imghost.service';
import { ImgHostController } from './imghost.controller';
import { AttachmentService } from '../media/attachment.service';

@Module({
  providers: [ImgHostService, AttachmentService],
  controllers: [ImgHostController],
})
export class ImgHostModule {}
