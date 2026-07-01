import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { GiveawayService, CreateGiveawayDto } from './giveaway.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('giveaways')
export class GiveawayController {
  constructor(private readonly giveaways: GiveawayService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.giveaways.list({ status, page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.giveaways.get(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') userId: string, @Body() dto: CreateGiveawayDto) {
    return this.giveaways.create(userId, dto);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  join(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.giveaways.join(id, userId);
  }

  @Post(':id/draw')
  @UseGuards(JwtAuthGuard)
  draw(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.giveaways.draw(id, userId, role);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.giveaways.cancel(id, userId, role);
  }
}
