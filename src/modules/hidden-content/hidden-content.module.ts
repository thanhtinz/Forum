import { Module } from '@nestjs/common';
import { HiddenContentService } from './hidden-content.service';
import { HiddenContentController } from './hidden-content.controller';

@Module({
  controllers: [HiddenContentController],
  providers: [HiddenContentService],
  exports: [HiddenContentService],
})
export class HiddenContentModule {}
