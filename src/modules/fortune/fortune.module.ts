import { Module } from '@nestjs/common';
import { FortuneService } from './fortune.service';
import { FortuneController } from './fortune.controller';

@Module({
  providers: [FortuneService],
  controllers: [FortuneController],
  exports: [FortuneService],
})
export class FortuneModule {}
