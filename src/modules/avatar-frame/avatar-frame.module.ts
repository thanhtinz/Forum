import { Module } from '@nestjs/common';
import { AvatarFrameService } from './avatar-frame.service';
import { AvatarFrameController } from './avatar-frame.controller';
import { GemModule } from '../gem/gem.module';

@Module({
  imports: [GemModule],
  controllers: [AvatarFrameController],
  providers: [AvatarFrameService],
  exports: [AvatarFrameService],
})
export class AvatarFrameModule {}
