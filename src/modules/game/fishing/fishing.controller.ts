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

  @Post('rod/buy')
  buyRod(@CurrentUser('id') userId: string, @Body('slug') slug: string) {
    return this.fishing.buyRod(userId, slug);
  }

  @Post('boat/buy')
  buyBoat(@CurrentUser('id') userId: string, @Body('slug') slug: string) {
    return this.fishing.buyBoat(userId, slug);
  }

  @Post('cast')
  cast(@CurrentUser('id') userId: string, @Body('depth') depth: number) {
    return this.fishing.cast(userId, Number(depth));
  }

  @Post('reel')
  reel(@CurrentUser('id') userId: string) {
    return this.fishing.reel(userId);
  }

  // ── Khoang thuyền ──
  @Get('boat-hold')
  boatHold(@CurrentUser('id') userId: string) {
    return this.fishing.boatHold(userId);
  }

  @Post('boat/to-kho')
  moveToKho(@CurrentUser('id') userId: string, @Body('id') id?: string) {
    return this.fishing.moveToKho(userId, id);
  }

  @Post('boat/sell-all')
  sellBoatAll(@CurrentUser('id') userId: string) {
    return this.fishing.sellBoatAll(userId);
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

  // ── Hồ nuôi cá ──
  @Get('pond')
  pond(@CurrentUser('id') userId: string) {
    return this.fishing.pond(userId);
  }

  @Post('pond/release/:catchId')
  releaseToPond(@CurrentUser('id') userId: string, @Param('catchId') catchId: string) {
    return this.fishing.releaseToPond(userId, catchId);
  }

  @Post('pond/release-all')
  releaseAllToPond(@CurrentUser('id') userId: string) {
    return this.fishing.releaseAllToPond(userId);
  }

  @Post('pond/harvest/:catchId')
  harvestPond(@CurrentUser('id') userId: string, @Param('catchId') catchId: string) {
    return this.fishing.harvestPond(userId, catchId);
  }

  @Post('pond/harvest-all')
  harvestPondAll(@CurrentUser('id') userId: string) {
    return this.fishing.harvestPondAll(userId);
  }

  @Get('leaderboard')
  leaderboard(@Query('limit') limit = 10) {
    return this.fishing.leaderboard(Number(limit));
  }
}
