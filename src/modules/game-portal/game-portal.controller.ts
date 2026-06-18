import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, RolesGuard, Roles } from '../../common/decorators/roles.decorator';
import { GamePortalService } from './game-portal.service';
import { ShopItemKind } from './game-portal.contract';

@Controller('game-portal')
export class GamePortalController {
  constructor(private readonly svc: GamePortalService) {}

  // ── Công khai (duyệt không cần đăng nhập) ──
  @Get('games')
  listGames() {
    return this.svc.listGames();
  }

  @Get('games/:slug')
  getGame(@Param('slug') slug: string) {
    return this.svc.getGame(slug);
  }

  @Get('games/:slug/servers')
  getServers(@Param('slug') slug: string) {
    return this.svc.getServers(slug);
  }

  @Get('games/:slug/identifier-kind')
  identifierKind(@Param('slug') slug: string) {
    return this.svc.identifierKind(slug);
  }

  @Get('games/:slug/giftcodes')
  listGiftcodes(@Param('slug') slug: string) {
    return this.svc.listGiftcodes(slug);
  }

  @Get('games/:slug/shop')
  listShop(@Param('slug') slug: string, @Query('kind') kind: ShopItemKind = 'item') {
    return this.svc.listShop(slug, kind === 'bundle' ? 'bundle' : 'item');
  }

  // ── Cần đăng nhập ──
  @Post('games/:slug/verify')
  @UseGuards(JwtAuthGuard)
  verify(@Param('slug') slug: string, @Body() body: { serverId: string; identifier: string }) {
    return this.svc.verifyCharacter(slug, body);
  }

  @Post('games/:slug/giftcode/redeem')
  @UseGuards(JwtAuthGuard)
  redeem(@Param('slug') slug: string, @Body() body: { code: string; serverId: string; identifier: string }) {
    return this.svc.redeemGiftcode(slug, body.code, { serverId: body.serverId, identifier: body.identifier });
  }

  @Post('games/:slug/shop/buy')
  @UseGuards(JwtAuthGuard)
  buy(
    @CurrentUser('id') userId: string,
    @Param('slug') slug: string,
    @Body() body: { itemId: string; kind: ShopItemKind; quantity?: number; serverId: string; identifier: string },
  ) {
    return this.svc.buyItem(userId, slug, body);
  }

  // ── Admin: quản lý đấu API game ──
  @Get('admin/apis')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  listApis() {
    return this.svc.listApis();
  }

  @Post('admin/apis')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  upsertApi(@Body() body: { id?: string; slug: string; name: string; baseUrl: string; apiKey?: string; identifierKind?: string; active?: boolean }) {
    return this.svc.upsertApi(body);
  }

  @Post('admin/apis/:id/test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  testApi(@Param('id') id: string) {
    return this.svc.testApi(id);
  }

  @Delete('admin/apis/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  deleteApi(@Param('id') id: string) {
    return this.svc.deleteApi(id);
  }
}
