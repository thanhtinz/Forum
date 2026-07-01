import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CosmeticsService } from './cosmetics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller()
export class CosmeticsController {
  constructor(private readonly svc: CosmeticsService) {}

  // ── Badge trang trí ──
  @Get('badge-products')
  listBadges() { return this.svc.listBadges(); }

  @Get('badge-products/inventory')
  @UseGuards(JwtAuthGuard)
  badgeInventory(@CurrentUser('id') userId: string) { return this.svc.badgeInventory(userId); }

  @Post('badge-products/equip')
  @UseGuards(JwtAuthGuard)
  equipBadge(@CurrentUser('id') userId: string, @Body() body: { badgeId: string | null }) {
    return this.svc.equipBadge(userId, body.badgeId);
  }

  @Post('badge-products/:id/buy')
  @UseGuards(JwtAuthGuard)
  buyBadge(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: { currency: 'coin' | 'gem' }) {
    return this.svc.buyBadge(userId, id, body.currency);
  }

  // ── Hiệu ứng tên ──
  @Get('name-effects')
  listEffects() { return this.svc.listEffects(); }

  @Get('name-effects/inventory')
  @UseGuards(JwtAuthGuard)
  effectInventory(@CurrentUser('id') userId: string) { return this.svc.effectInventory(userId); }

  @Post('name-effects/equip')
  @UseGuards(JwtAuthGuard)
  equipEffect(@CurrentUser('id') userId: string, @Body() body: { effectId: string | null }) {
    return this.svc.equipEffect(userId, body.effectId);
  }

  @Post('name-effects/:id/buy')
  @UseGuards(JwtAuthGuard)
  buyEffect(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: { currency: 'coin' | 'gem' }) {
    return this.svc.buyEffect(userId, id, body.currency);
  }

  // ── Bong bóng chat ──
  @Get('chat-bubbles')
  listBubbles() { return this.svc.listBubbles(); }

  @Get('chat-bubbles/inventory')
  @UseGuards(JwtAuthGuard)
  bubbleInventory(@CurrentUser('id') userId: string) { return this.svc.bubbleInventory(userId); }

  @Post('chat-bubbles/equip')
  @UseGuards(JwtAuthGuard)
  equipBubble(@CurrentUser('id') userId: string, @Body() body: { bubbleId: string | null }) {
    return this.svc.equipBubble(userId, body.bubbleId);
  }

  @Post('chat-bubbles/:id/buy')
  @UseGuards(JwtAuthGuard)
  buyBubble(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() body: { currency: 'coin' | 'gem' }) {
    return this.svc.buyBubble(userId, id, body.currency);
  }
}
