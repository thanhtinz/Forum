import { Module } from '@nestjs/common';
import { CosmeticsService } from './cosmetics.service';
import { CosmeticsController } from './cosmetics.controller';
import { GemModule } from '../gem/gem.module';

@Module({
  imports: [GemModule],
  controllers: [CosmeticsController],
  providers: [CosmeticsService],
  exports: [CosmeticsService],
})
export class CosmeticsModule {}
