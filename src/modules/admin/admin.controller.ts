import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminShopService } from './admin-shop.service';
import { AdminGameAssetService } from './admin-game-asset.service';
import { AdminTemplateService, TemplateType } from './admin-template.service';
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
    private readonly templates: AdminTemplateService,
  ) {}

  // ── Game templates (cây/cá/phân/vật nuôi/wardrobe) ──
  @Get('templates/:type')
  listTemplates(@Param('type') type: TemplateType) {
    return this.templates.list(type);
  }

  @Post('templates/:type')
  createTemplate(@Param('type') type: TemplateType, @Body() body: Record<string, unknown>) {
    return this.templates.create(type, body);
  }

  @Patch('templates/:type/:id')
  updateTemplate(@Param('type') type: TemplateType, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.templates.update(type, id, body);
  }

  @Delete('templates/:type/:id')
  deleteTemplate(@Param('type') type: TemplateType, @Param('id') id: string) {
    return this.templates.remove(type, id);
  }

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

  @Post('users/:id/spam-clean')
  spamClean(@Param('id') id: string, @Body() body: { reason?: string }, @CurrentUser('id') actorId: string) {
    return this.dashboard.spamClean(id, body?.reason || 'Spam', actorId);
  }

  @Post('users/:id/gem')
  adjustGem(
    @Param('id') id: string,
    @Body() body: { amount: number; note: string },
    @CurrentUser('id') actorId: string,
  ) {
    return this.dashboard.adjustGem(id, body.amount, body.note, actorId);
  }

  @Post('users/:id/coin')
  adjustCoin(
    @Param('id') id: string,
    @Body() body: { amount: number; note: string },
    @CurrentUser('id') actorId: string,
  ) {
    return this.dashboard.adjustCoin(id, body.amount, body.note, actorId);
  }

  @Patch('users/:id/info')
  updateUserInfo(
    @Param('id') id: string,
    @Body() body: { displayName?: string; email?: string },
    @CurrentUser('id') actorId: string,
  ) {
    return this.dashboard.updateUserInfo(id, body, actorId);
  }

  @Post('users/:id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body('password') password: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.dashboard.resetPassword(id, password, actorId);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.dashboard.deleteUser(id, actorId);
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

  @Post('stickers/import-urls')
  importStickerPackFromUrls(@Body() data: { slug: string; name: string; description?: string; isPremium?: boolean; urls: string[] }) {
    return this.gameAsset.importStickerPackFromUrls(data);
  }

  @Post('stickers/import-wpdiscuz')
  importFromWpDiscuz(@Body('searchUrls') searchUrls: string[]) {
    return this.gameAsset.importFromWpDiscuzSearch(searchUrls);
  }

  @Patch('stickers/:id')
  updateStickerPack(@Param('id') id: string, @Body() data: any) {
    return this.gameAsset.updateStickerPack(id, data);
  }

  @Post('stickers/:id/delete')
  deleteStickerPack(@Param('id') id: string) { return this.gameAsset.deleteStickerPack(id); }

  @Post('stickers/:id/hard-delete')
  hardDeleteStickerPack(@Param('id') id: string) { return this.gameAsset.hardDeleteStickerPack(id); }

  @Post('stickers/:packId/add')
  addSticker(@Param('packId') packId: string, @Body() sticker: any) {
    return this.gameAsset.addStickerToPack(packId, sticker);
  }

  @Post('stickers/sticker/:id/delete')
  removeSticker(@Param('id') id: string) { return this.gameAsset.removeSticker(id); }

  // ════════════════════════════════════════════
  // THƯ VIỆN AVATAR (pack ảnh đại diện cho user chọn)
  // ════════════════════════════════════════════
  @Get('avatars')
  listAvatarPacks() { return this.gameAsset.listAvatarPacks(); }

  @Post('avatars')
  createAvatarPack(@Body() data: any) { return this.gameAsset.createAvatarPack(data); }

  @Patch('avatars/:id')
  updateAvatarPack(@Param('id') id: string, @Body() data: any) {
    return this.gameAsset.updateAvatarPack(id, data);
  }

  @Post('avatars/:id/delete')
  deleteAvatarPack(@Param('id') id: string) { return this.gameAsset.deleteAvatarPack(id); }

  @Post('avatars/:packId/add')
  addAvatar(@Param('packId') packId: string, @Body() avatar: any) {
    return this.gameAsset.addAvatarToPack(packId, avatar);
  }

  @Post('avatars/image/:id/delete')
  removeAvatar(@Param('id') id: string) { return this.gameAsset.removeAvatar(id); }

  // ════════════════════════════════════════════
  // KHUNG AVATAR (sản phẩm bán bằng coin/gem)
  // ════════════════════════════════════════════
  @Get('frames')
  listFrames() { return this.gameAsset.listFrames(); }

  @Post('frames')
  createFrame(@Body() data: any) { return this.gameAsset.createFrame(data); }

  @Patch('frames/:id')
  updateFrame(@Param('id') id: string, @Body() data: any) { return this.gameAsset.updateFrame(id, data); }

  @Post('frames/:id/delete')
  deleteFrame(@Param('id') id: string) { return this.gameAsset.deleteFrame(id); }

  // ════════════════════════════════════════════
  // BADGE TRANG TRÍ (sản phẩm bán bằng coin/gem)
  // ════════════════════════════════════════════
  @Get('badge-products')
  listBadgeProducts() { return this.gameAsset.listBadgeProducts(); }

  @Post('badge-products')
  createBadgeProduct(@Body() data: any) { return this.gameAsset.createBadgeProduct(data); }

  @Patch('badge-products/:id')
  updateBadgeProduct(@Param('id') id: string, @Body() data: any) { return this.gameAsset.updateBadgeProduct(id, data); }

  @Post('badge-products/:id/delete')
  deleteBadgeProduct(@Param('id') id: string) { return this.gameAsset.deleteBadgeProduct(id); }

  // ════════════════════════════════════════════
  // HIỆU ỨNG TÊN (sản phẩm bán bằng coin/gem)
  // ════════════════════════════════════════════
  @Get('name-effects')
  listNameEffects() { return this.gameAsset.listNameEffects(); }

  @Post('name-effects')
  createNameEffect(@Body() data: any) { return this.gameAsset.createNameEffect(data); }

  @Patch('name-effects/:id')
  updateNameEffect(@Param('id') id: string, @Body() data: any) { return this.gameAsset.updateNameEffect(id, data); }

  @Post('name-effects/:id/delete')
  deleteNameEffect(@Param('id') id: string) { return this.gameAsset.deleteNameEffect(id); }

  // ════════════════════════════════════════════
  // BONG BÓNG CHAT (sản phẩm bán bằng coin/gem)
  // ════════════════════════════════════════════
  @Get('chat-bubbles')
  listChatBubbles() { return this.gameAsset.listChatBubbles(); }

  @Post('chat-bubbles')
  createChatBubble(@Body() data: any) { return this.gameAsset.createChatBubble(data); }

  @Patch('chat-bubbles/:id')
  updateChatBubble(@Param('id') id: string, @Body() data: any) { return this.gameAsset.updateChatBubble(id, data); }

  @Post('chat-bubbles/:id/delete')
  deleteChatBubble(@Param('id') id: string) { return this.gameAsset.deleteChatBubble(id); }
}
