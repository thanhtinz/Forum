import { Module } from '@nestjs/common';
import { GemService } from './gem.service';
import { GemController } from './gem.controller';
import { VipModule } from '../vip/vip.module';

@Module({
  imports: [VipModule],
  providers: [GemService],
  controllers: [GemController],
  exports: [GemService],
})
export class GemModule {}
