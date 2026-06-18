import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { CharacterService } from './character/character.service';
import { SurvivalService } from './character/survival.service';
import { CombatService } from './combat/combat.service';
import { ShopService } from './shop/shop.service';
import { SpecialItemService } from './shop/special-item.service';
import { GuildService } from './guild/guild.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';
import { Gender, EquipSlot, ItemRarity, GuildRole } from '@prisma/client';
import { Currency } from '../../common/enums';

@Controller('game')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(
    private readonly character: CharacterService,
    private readonly survival: SurvivalService,
    private readonly combat: CombatService,
    private readonly shop: ShopService,
    private readonly special: SpecialItemService,
    private readonly guild: GuildService,
  ) {}

  // ── Character ──
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

  @Post('character/stats')
  allocateStats(
    @CurrentUser('id') userId: string,
    @Body() alloc: { strength?: number; vitality?: number; agility?: number; intelligence?: number },
  ) {
    return this.character.allocateStats(userId, alloc);
  }

  @Get('inventory')
  getInventory(@CurrentUser('id') userId: string) {
    return this.character.getInventory(userId);
  }

  // ── Survival (đói/khát/vệ sinh/ngủ/bệnh) ──
  @Get('survival')
  getSurvival(@CurrentUser('id') userId: string) {
    return this.survival.getSurvival(userId);
  }

  @Get('consumables')
  listConsumables() {
    return this.survival.listConsumables();
  }

  @Post('survival/consume')
  consume(@CurrentUser('id') userId: string, @Body('consumableId') id: string) {
    return this.survival.consume(userId, id);
  }

  @Post('survival/sleep')
  sleep(@CurrentUser('id') userId: string, @Body('hours') hours: number) {
    return this.survival.sleep(userId, hours);
  }

  @Post('survival/clean')
  clean(@CurrentUser('id') userId: string) {
    return this.survival.clean(userId);
  }

  // ── Special items (thẻ đổi tên, nổi bật tên) ──
  @Get('special/shop')
  listSpecialShop() {
    return this.special.listShop();
  }

  @Get('special/inventory')
  getSpecialInventory(@CurrentUser('id') userId: string) {
    return this.special.getUserCosmetics(userId);
  }

  @Post('special/buy')
  buySpecial(
    @CurrentUser('id') userId: string,
    @Body() body: { templateId: string; currency: Currency },
  ) {
    return this.special.buy(userId, body.templateId, body.currency);
  }

  @Post('special/rename')
  rename(@CurrentUser('id') userId: string, @Body('newUsername') newUsername: string) {
    return this.special.renameUser(userId, newUsername);
  }

  @Post('special/activate')
  activateEffect(@CurrentUser('id') userId: string, @Body('userItemId') id: string) {
    return this.special.activateNameEffect(userId, id);
  }

  @Post('equip')
  equipItem(@CurrentUser('id') userId: string, @Body('inventoryItemId') id: string) {
    return this.character.equipItem(userId, id);
  }

  @Post('unequip')
  unequipItem(@CurrentUser('id') userId: string, @Body('slot') slot: EquipSlot) {
    return this.character.unequipItem(userId, slot);
  }

  // ── Shop ──
  @Get('shop')
  listShop(
    @Query('slot') slot?: EquipSlot,
    @Query('rarity') rarity?: ItemRarity,
    @Query('currency') currency?: Currency,
  ) {
    return this.shop.listItems({ slot, rarity, currency });
  }

  @Post('shop/buy')
  buyItem(
    @CurrentUser('id') userId: string,
    @Body() body: { templateId: string; currency: Currency; quantity?: number },
  ) {
    return this.shop.buyItem(userId, body.templateId, body.currency, body.quantity);
  }

  @Post('shop/enhance')
  enhanceItem(@CurrentUser('id') userId: string, @Body('inventoryItemId') id: string) {
    return this.shop.enhanceItem(userId, id);
  }

  // ── PvP ──
  @Get('pvp/opponents')
  findOpponents(@CurrentUser('id') userId: string) {
    return this.combat.findOpponents(userId);
  }

  @Post('pvp/auto')
  pvpAuto(@CurrentUser('id') userId: string, @Body('targetId') targetId: string) {
    return this.combat.pvpAuto(userId, targetId);
  }

  @Post('pvp/manual/start')
  pvpManualStart(@CurrentUser('id') userId: string, @Body('targetId') targetId: string) {
    return this.combat.pvpManualStart(userId, targetId);
  }

  @Post('pvp/manual/turn')
  pvpManualTurn(@CurrentUser('id') userId: string, @Body() payload: any) {
    return this.combat.pvpManualTurn(userId, payload);
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
