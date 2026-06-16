import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';
import { PresenceService } from './presence.service';
import { StatsService, StatsPeriod } from './stats.service';

@Controller('community')
export class CommunityController {
  constructor(
    private readonly presence: PresenceService,
    private readonly stats: StatsService,
  ) {}

  @Post('heartbeat')
  @UseGuards(JwtAuthGuard)
  heartbeat(@CurrentUser('id') userId: string) {
    return this.presence.heartbeat(userId);
  }

  @Get('online')
  online(@Query('withinMinutes') withinMinutes?: string) {
    return this.presence.onlineUsers(withinMinutes ? Number(withinMinutes) : undefined);
  }

  @Get('threads/:threadId/viewing')
  viewing(
    @Param('threadId') threadId: string,
    @Query('withinMinutes') withinMinutes?: string,
  ) {
    return this.presence.viewingThread(
      threadId,
      withinMinutes ? Number(withinMinutes) : undefined,
    );
  }

  @Get('reaction-leaderboard')
  reactionLeaderboard(
    @Query('period') period?: StatsPeriod,
    @Query('limit') limit?: string,
  ) {
    return this.stats.reactionLeaderboard({
      period,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('top-contributors')
  topContributors(
    @Query('period') period?: StatsPeriod,
    @Query('limit') limit?: string,
  ) {
    return this.stats.topContributors({
      period,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('stats')
  forumStats() {
    return this.stats.forumStats();
  }
}
