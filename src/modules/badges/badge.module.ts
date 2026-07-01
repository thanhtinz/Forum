import { Module } from '@nestjs/common';
import { BadgeService } from './badge.service';
import { LevelService } from './level.service';
import { BadgeController } from './badge.controller';

@Module({
  controllers: [BadgeController],
  providers: [BadgeService, LevelService],
  exports: [BadgeService, LevelService],
})
export class BadgesModule {}
