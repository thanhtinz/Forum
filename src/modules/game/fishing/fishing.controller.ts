import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FishingService } from './fishing.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/roles.decorator';

@Controller('fishing')
@UseGuards(JwtAuthGuard)
export class FishingController {
  constructor(private readonly fishing: FishingService) {}

  @Get('state')
  state(@CurrentUser('id') userId: string) {
    return this.fishing.getState(userId);
  }

  @Post('buy-rod')
  buyRod(@CurrentUser('id') userId: string, @Body('zone') zone: number) {
    return this.fishing.buyRod(userId, Number(zone));
  }

  @Post('buy-bait')
  buyBait(
    @CurrentUser('id') userId: string,
    @Body() body: { zone: number; packs?: number },
  ) {
    return this.fishing.buyBait(userId, Number(body.zone), Number(body.packs ?? 1));
  }

  @Post('cast')
  cast(@CurrentUser('id') userId: string, @Body('zone') zone: number) {
    return this.fishing.cast(userId, Number(zone));
  }

  @Post('reel')
  reel(@CurrentUser('id') userId: string) {
    return this.fishing.reel(userId);
  }

  @Get('storage')
  storage(@CurrentUser('id') userId: string) {
    return this.fishing.storage(userId);
  }

  @Post('sell/:catchId')
  sell(@CurrentUser('id') userId: string, @Param('catchId') catchId: string) {
    return this.fishing.sell(userId, catchId);
  }

  @Post('sell-all')
  sellAll(@CurrentUser('id') userId: string) {
    return this.fishing.sellAll(userId);
  }

  @Get('leaderboard')
  leaderboard(@Query('limit') limit = 10) {
    return this.fishing.leaderboard(Number(limit));
  }
}
