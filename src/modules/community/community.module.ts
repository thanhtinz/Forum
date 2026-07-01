import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { PresenceService } from './presence.service';
import { StatsService } from './stats.service';

@Module({
  controllers: [CommunityController],
  providers: [PresenceService, StatsService],
  exports: [PresenceService, StatsService],
})
export class CommunityModule {}
