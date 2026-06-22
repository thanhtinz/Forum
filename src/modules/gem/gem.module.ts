import { Module } from '@nestjs/common';
import { GemService } from './gem.service';
import { GemController } from './gem.controller';

@Module({
  providers: [GemService],
  controllers: [GemController],
  exports: [GemService],
})
export class GemModule {}
