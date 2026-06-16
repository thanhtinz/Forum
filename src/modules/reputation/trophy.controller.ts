import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TrophyService } from './trophy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('trophies')
export class TrophyController {
  constructor(private readonly trophyService: TrophyService) {}

  @Get('leaderboard')
  leaderboard(@Query('limit') limit = 20) {
    return this.trophyService.leaderboard(Number(limit));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyTrophies(@CurrentUser('id') userId: string) {
    return this.trophyService.getUserTrophies(userId);
  }

  @Get('user/:userId')
  getUserTrophies(@Param('userId') userId: string) {
    return this.trophyService.getUserTrophies(userId);
  }
}
