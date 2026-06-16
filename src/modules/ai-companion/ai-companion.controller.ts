import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AiCompanionService } from './ai-companion.service';
import { OutfitService } from './outfit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('ai')
export class AiCompanionController {
  constructor(
    private readonly aiService: AiCompanionService,
    private readonly outfitService: OutfitService,
  ) {}

  @Get('personas')
  listPersonas() {
    return this.aiService.listPersonas();
  }

  @Post('sessions')
  @UseGuards(JwtAuthGuard)
  createSession(
    @CurrentUser('id') userId: string,
    @Body() body: { personaId?: string; context?: any },
  ) {
    return this.aiService.getOrCreateSession(userId, body.personaId, body.context);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  listSessions(@CurrentUser('id') userId: string) {
    return this.aiService.listSessions(userId);
  }

  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard)
  getSession(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.aiService.getSession(id, userId);
  }

  // ── Outfit & Bonding ──
  @Get('characters/:characterId/bond')
  @UseGuards(JwtAuthGuard)
  getBondState(
    @Param('characterId') characterId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.outfitService.getBondState(userId, characterId);
  }

  @Post('characters/:characterId/outfit')
  @UseGuards(JwtAuthGuard)
  switchOutfit(
    @Param('characterId') characterId: string,
    @Body('outfitSlug') outfitSlug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.outfitService.switchOutfit(userId, characterId, outfitSlug);
  }
}
