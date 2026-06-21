import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { CharacterService } from './character/character.service';
import { GuildService } from './guild/guild.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';
import { Gender, GuildRole } from '@prisma/client';

@Controller('game')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(
    private readonly character: CharacterService,
    private readonly guild: GuildService,
  ) {}

  // ── Character (ví coin + cấp độ) ──
  @Post('character')
  createCharacter(
    @CurrentUser('id') userId: string,
    @Body() body: { gender: Gender; appearance?: any },
  ) {
    return this.character.createCharacter(userId, body.gender, body.appearance);
  }

  @Get('character')
  getCharacter(@CurrentUser('id') userId: string) {
    return this.character.getCharacter(userId);
  }

  @Get('coin/transactions')
  coinTransactions(@CurrentUser('id') userId: string, @Query('page') page = 1) {
    return this.character.getCoinTransactions(userId, Number(page));
  }

  // ── Guild ──
  @Get('guilds')
  listGuilds(@Query('page') page = 1) {
    return this.guild.listGuilds(Number(page));
  }

  @Get('guilds/:id')
  getGuild(@Param('id') id: string) {
    return this.guild.getGuild(id);
  }

  @Post('guilds')
  createGuild(
    @CurrentUser('id') userId: string,
    @Body() body: { name: string; tag: string; description?: string },
  ) {
    return this.guild.createGuild(userId, body);
  }

  @Post('guilds/:id/join')
  joinGuild(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.guild.joinGuild(userId, id);
  }

  @Post('guilds/leave')
  leaveGuild(@CurrentUser('id') userId: string) {
    return this.guild.leaveGuild(userId);
  }

  @Post('guilds/donate')
  donateCoin(@CurrentUser('id') userId: string, @Body('amount') amount: number) {
    return this.guild.donateCoin(userId, amount);
  }

  @Post('guilds/update')
  updateGuild(@CurrentUser('id') userId: string, @Body() body: { description?: string; emblemUrl?: string; isPublic?: boolean; reqLevel?: number }) {
    return this.guild.updateGuild(userId, body);
  }

  @Post('guilds/members/:memberId/kick')
  kickMember(@CurrentUser('id') userId: string, @Param('memberId') memberId: string) {
    return this.guild.kickMember(userId, memberId);
  }

  @Post('guilds/members/:memberId/role')
  setMemberRole(@CurrentUser('id') userId: string, @Param('memberId') memberId: string, @Body('role') role: GuildRole) {
    return this.guild.setMemberRole(userId, memberId, role);
  }

  @Post('guilds/members/:memberId/transfer')
  transferLeadership(@CurrentUser('id') userId: string, @Param('memberId') memberId: string) {
    return this.guild.transferLeadership(userId, memberId);
  }

  @Post('guilds/disband')
  disbandGuild(@CurrentUser('id') userId: string) {
    return this.guild.disbandGuild(userId);
  }
}
