import { Module } from '@nestjs/common';
import { VipService } from './vip.service';
import { VipController } from './vip.controller';

@Module({
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
