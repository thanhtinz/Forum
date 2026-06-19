import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';
import { ScamCaseStatus } from '@prisma/client';
import { ScamService } from './scam.service';
import { AppealDto, CommentDto, CreateScamCaseDto, UpdateScamCaseDto, VoteDto } from './scam.dto';

@Controller('scam')
export class ScamController {
  constructor(private readonly scam: ScamService) {}

  // ----- Công khai -----
  @Get('cases')
  list(
    @Query('status') status?: ScamCaseStatus,
    @Query('targetType') targetType?: string,
    @Query('reason') reason?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.scam.list({ status, targetType, reason, q, page: Number(page), limit: Number(limit) });
  }

  @Get('search')
  search(@Query('q') q: string) { return this.scam.search(q || ''); }

  @Get('scammer')
  scammer(@Query('userId') userId?: string, @Query('wallet') wallet?: string, @Query('domain') domain?: string) {
    return this.scam.scammerProfile({ userId, wallet, domain });
  }

  @Get('public/top')
  top(@Query('limit') limit?: string) { return this.scam.topScammers(Number(limit) || 20); }

  @Get('public/recent')
  recent(@Query('limit') limit?: string) { return this.scam.recentWarnings(Number(limit) || 12); }

  @Get('public/cleared')
  cleared(@Query('limit') limit?: string) { return this.scam.clearedList(Number(limit) || 20); }

  @Get('public/stats')
  stats() { return this.scam.publicStats(); }

  @Get('guide')
  guide() { return this.scam.guide(); }

  // ----- Người dùng -----
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser('id') uid: string) { return this.scam.mine(uid); }

  @Post('cases')
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') uid: string, @Body() dto: CreateScamCaseDto) { return this.scam.create(uid, dto); }

  @Get('cases/:id')
  @UseGuards(OptionalJwtGuard)
  detail(@Param('id') id: string, @CurrentUser('id') uid?: string) { return this.scam.detail(id, uid); }

  @Patch('cases/:id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @CurrentUser('id') uid: string, @Body() dto: UpdateScamCaseDto) { return this.scam.update(id, uid, dto); }

  @Post('cases/:id/comment')
  @UseGuards(JwtAuthGuard)
  comment(@Param('id') id: string, @CurrentUser('id') uid: string, @Body() dto: CommentDto) { return this.scam.comment(id, uid, dto); }

  @Post('cases/:id/vote')
  @UseGuards(JwtAuthGuard)
  vote(@Param('id') id: string, @CurrentUser('id') uid: string, @Body() dto: VoteDto) { return this.scam.vote(id, uid, dto.kind); }

  @Post('cases/:id/follow')
  @UseGuards(JwtAuthGuard)
  follow(@Param('id') id: string, @CurrentUser('id') uid: string) { return this.scam.follow(id, uid); }

  @Post('cases/:id/appeal')
  @UseGuards(JwtAuthGuard)
  appeal(@Param('id') id: string, @CurrentUser('id') uid: string, @Body() dto: AppealDto) { return this.scam.appeal(id, uid, dto); }
}
