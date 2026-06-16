import {
  Controller, Get, Post, Patch, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminShopService } from './admin-shop.service';
import { AdminGameAssetService } from './admin-game-asset.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard, Roles, CurrentUser } from '../../common/decorators/roles.decorator';
import { UserRole, UserStatus, ReportStatus, MinigameType } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(
    private readonly config: AdminConfigService,
    private readonly dashboard: AdminDashboardService,
    private readonly shop: AdminShopService,
    private readonly gameAsset: AdminGameAssetService,
  ) {}

  // ── Dashboard ──
  @Get('stats')
  getStats() {
    return this.dashboard.getStats();
  }

  @Get('stats/user-growth')
  getUserGrowth(@Query('days') days = 30) {
    return this.dashboard.getUserGrowth(Number(days));
  }

  // ── Config ──
  @Get('config')
  getAllConfig() {
    return this.config.getAllGroups();
  }

  @Get('config/:groupKey')
  getConfigGroup(@Param('groupKey') groupKey: string) {
    return this.config.getGroup(groupKey);
  }

  @Patch('config/setting/:key')
  updateSetting(
    @Param('key') key: string,
    @Body('value') value: any,
    @CurrentUser('id') actorId: string,
  ) {
    return this.config.updateSetting(key, value, actorId);
  }

  @Patch('config/batch')
  updateBatch(
    @Body('updates') updates: { key: string; value: any }[],
    @CurrentUser('id') actorId: string,
  ) {
    return this.config.updateBatch(updates, actorId);
  }

  @Post('config/seed')
  seedConfig() {
    return this.config.seedDefaults();
  }

  // ── Users ──
  @Get('users')
  listUsers(
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('page') page = 1,
    @Query('limit') limit = 25,
  ) {
    return this.dashboard.listUsers({ search, role, status, page: Number(page), limit: Number(limit) });
  }

  @Patch('users/:id/role')
  updateUserRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
    @CurrentUser('id') actorId: string,
  ) {
    return this.dashboard.updateUserRole(id, role, actorId);
  }

  @Post('users/:id/ban')
  banUser(
    @Param('id') id: string,
    @Body() body: { reason: string; until?: string },
    @CurrentUser('id') actorId: string,
  ) {
    return this.dashboard.banUser(id, body.reason, body.until ? new Date(body.until) : null, actorId);
  }

  @Post('users/:id/unban')
  unbanUser(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.dashboard.unbanUser(id, actorId);
  }

  @Post('users/:id/gem')
  adjustGem(
    @Param('id') id: string,
    @Body() body: { amount: number; note: string },
    @CurrentUser('id') actorId: string,
  ) {
    return this.dashboard.adjustGem(id, body.amount, body.note, actorId);
  }

  // ── Moderation ──
  @Get('reports')
  getReports(
    @Query('status') status: ReportStatus = 'PENDING',
    @Query('page') page = 1,
  ) {
    return this.dashboard.getReports(status, Number(page));
  }

  @Post('reports/:id/resolve')
  resolveReport(
    @Param('id') id: string,
    @Body() body: { action: 'resolve' | 'dismiss'; modNote: string },
    @CurrentUser('id') actorId: string,
  ) {
    return this.dashboard.resolveReport(id, body.action, body.modNote, actorId);
  }

  // ── Audit ──
  @Get('audit')
  getAuditLogs(
    @Query('page') page = 1,
    @Query('action') action?: string,
  ) {
    return this.dashboard.getAuditLogs(Number(page), 50, action);
  }

  // ════════════════════════════════════════════
  // SHOP MANAGEMENT — CRUD động cho mọi loại item
  // ════════════════════════════════════════════

  // Equipment (vũ khí, trang bị, skin)
  @Get('shop/equipment')
  listEquipment() { return this.shop.listEquipment(); }

  @Post('shop/equipment')
  createEquipment(@Body() data: any) { return this.shop.createEquipment(data); }

  @Patch('shop/equipment/:id')
  updateEquipment(@Param('id') id: string, @Body() data: any) { return this.shop.updateEquipment(id, data); }

  @Post('shop/equipment/:id/delete')
  deleteEquipment(@Param('id') id: string) { return this.shop.deleteEquipment(id); }

  // Consumables (thức ăn, nước, thuốc)
  @Get('shop/consumables')
  listConsumables() { return this.shop.listConsumables(); }

  @Post('shop/consumables')
  createConsumable(@Body() data: any) { return this.shop.createConsumable(data); }

  @Patch('shop/consumables/:id')
  updateConsumable(@Param('id') id: string, @Body() data: any) { return this.shop.updateConsumable(id, data); }

  @Post('shop/consumables/:id/delete')
  deleteConsumable(@Param('id') id: string) { return this.shop.deleteConsumable(id); }

  // Special items (thẻ đổi tên, nổi bật tên...)
  @Get('shop/special')
  listSpecialItems() { return this.shop.listSpecialItems(); }

  @Post('shop/special')
  createSpecialItem(@Body() data: any) { return this.shop.createSpecialItem(data); }

  @Patch('shop/special/:id')
  updateSpecialItem(@Param('id') id: string, @Body() data: any) { return this.shop.updateSpecialItem(id, data); }

  @Post('shop/special/:id/delete')
  deleteSpecialItem(@Param('id') id: string) { return this.shop.deleteSpecialItem(id); }

  // ════════════════════════════════════════════
  // TROPHY / DANH HIỆU MANAGEMENT
  // ════════════════════════════════════════════
  @Get('trophies')
  listTrophies() { return this.shop.listTrophies(); }

  @Post('trophies')
  createTrophy(@Body() data: any) { return this.shop.createTrophy(data); }

  @Patch('trophies/:id')
  updateTrophy(@Param('id') id: string, @Body() data: any) { return this.shop.updateTrophy(id, data); }

  @Post('trophies/:id/delete')
  deleteTrophy(@Param('id') id: string) { return this.shop.deleteTrophy(id); }

  // User Title Ladder
  @Get('titles')
  listTitles() { return this.shop.listTitles(); }

  @Post('titles')
  createTitle(@Body() data: any) { return this.shop.createTitle(data); }

  @Patch('titles/:id')
  updateTitle(@Param('id') id: string, @Body() data: any) { return this.shop.updateTitle(id, data); }

  @Post('titles/:id/delete')
  deleteTitle(@Param('id') id: string) { return this.shop.deleteTitle(id); }

  // ════════════════════════════════════════════
  // MINIGAME CONFIG + ASSET
  // ════════════════════════════════════════════
  @Get('minigames')
  listMinigames() { return this.gameAsset.listMinigames(); }

  @Post('minigames/:type')
  upsertMinigame(@Param('type') type: MinigameType, @Body() data: any) {
    return this.gameAsset.upsertMinigame(type, data);
  }

  @Patch('minigames/:type/assets')
  updateMinigameAssets(@Param('type') type: MinigameType, @Body('assetConfig') assetConfig: any) {
    return this.gameAsset.updateMinigameAssets(type, assetConfig);
  }

  // ════════════════════════════════════════════
  // STICKER PACKS (upload zip → tạo pack)
  // ════════════════════════════════════════════
  @Get('stickers')
  listStickerPacks() { return this.gameAsset.listStickerPacks(); }

  @Post('stickers')
  createStickerPack(@Body() data: any) { return this.gameAsset.createStickerPack(data); }

  @Patch('stickers/:id')
  updateStickerPack(@Param('id') id: string, @Body() data: any) {
    return this.gameAsset.updateStickerPack(id, data);
  }

  @Post('stickers/:id/delete')
  deleteStickerPack(@Param('id') id: string) { return this.gameAsset.deleteStickerPack(id); }

  @Post('stickers/:packId/add')
  addSticker(@Param('packId') packId: string, @Body() sticker: any) {
    return this.gameAsset.addStickerToPack(packId, sticker);
  }
}
