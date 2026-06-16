import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  BadgeService,
  CreateBadgeDto,
  UpdateBadgeDto,
} from './badge.service';
import {
  LevelService,
  CreateLevelTierDto,
  UpdateLevelTierDto,
} from './level.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { Roles, RolesGuard } from '../../common/decorators/roles.decorator';

@Controller('badges')
export class BadgeController {
  constructor(
    private readonly badges: BadgeService,
    private readonly levels: LevelService,
  ) {}

  @Get('user/:userId')
  @UseGuards(OptionalJwtGuard)
  async userBadges(@Param('userId') userId: string) {
    // Best-effort lazy recompute of auto milestones; never block the response.
    await this.badges.recomputeMilestones(userId).catch(() => undefined);
    return { badges: await this.badges.getUserBadges(userId) };
  }

  @Get('catalog')
  catalog() {
    return this.badges.listCatalog();
  }

  // ── Levels (public) ──
  @Get('levels')
  levels_() {
    return this.levels.listTiers();
  }

  @Get('levels/user/:userId')
  userLevel(@Param('userId') userId: string) {
    return this.levels.getUserLevelByUserId(userId);
  }

  // ── Levels admin ──
  @Post('admin/levels')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createLevel(@Body() dto: CreateLevelTierDto) {
    return this.levels.createTier(dto);
  }

  @Patch('admin/levels/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateLevel(@Param('id') id: string, @Body() dto: UpdateLevelTierDto) {
    return this.levels.updateTier(id, dto);
  }

  @Delete('admin/levels/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteLevel(@Param('id') id: string) {
    return this.levels.deleteTier(id);
  }

  // ── Admin ──
  @Post('admin/catalog')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createBadge(@Body() dto: CreateBadgeDto) {
    return this.badges.createBadge(dto);
  }

  @Patch('admin/catalog/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateBadge(@Param('id') id: string, @Body() dto: UpdateBadgeDto) {
    return this.badges.updateBadge(id, dto);
  }

  @Delete('admin/catalog/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteBadge(@Param('id') id: string) {
    return this.badges.deleteBadge(id);
  }

  @Post('admin/award')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  award(@Body() body: { userId: string; badgeId: string }) {
    return this.badges.awardBadge(body.userId, body.badgeId);
  }

  @Post('admin/revoke')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  revoke(@Body() body: { userId: string; badgeId: string }) {
    return this.badges.revokeBadge(body.userId, body.badgeId);
  }

  @Post('admin/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  verify(@Body() body: { userId: string; value: boolean }) {
    return this.badges.setVerified(body.userId, body.value);
  }

  // Icon ảnh cho badge hệ thống (role/verify/seller)
  @Get('system-icons')
  systemIcons() {
    return this.badges.getSystemIcons();
  }

  @Post('admin/system-icons')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  setSystemIcons(@Body() body: Record<string, string>) {
    return this.badges.setSystemIcons(body);
  }
}
