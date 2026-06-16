import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TrophyService } from './trophy.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('trophies')
export class TrophyController {
  constructor(private readonly trophyService: TrophyService) {}

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
