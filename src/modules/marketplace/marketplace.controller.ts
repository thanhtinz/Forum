import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceShopService } from './marketplace-shop.service';
import { CreateStorefrontDto, UpdateStorefrontDto } from './marketplace.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplace: MarketplaceService,
    private readonly shop: MarketplaceShopService,
  ) {}

  // ── Danh mục (public + admin) ──
  @Get('categories')
  categories() { return this.shop.listCategories(); }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  createCategory(@Body() b: { name: string; slug?: string; icon?: string; sortOrder?: number }) { return this.shop.adminCreateCategory(b); }

  @Patch('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  updateCategory(@Param('id') id: string, @Body() b: Record<string, unknown>) { return this.shop.adminUpdateCategory(id, b); }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  deleteCategory(@Param('id') id: string) { return this.shop.adminDeleteCategory(id); }

  // ── Sản phẩm ──
  @Get('products')
  browse(@Query('category') c?: string, @Query('q') q?: string, @Query('page') page = 1) { return this.shop.browseProducts(c, q, Number(page)); }

  @Get('storefronts/:slug/products')
  storeProducts(@Param('slug') slug: string) { return this.shop.storeProducts(slug); }

  @Get('me/products')
  @UseGuards(JwtAuthGuard)
  myProducts(@CurrentUser('id') userId: string) { return this.shop.myProducts(userId); }

  @Post('products')
  @UseGuards(JwtAuthGuard)
  createProduct(@CurrentUser('id') userId: string, @Body() b: any) { return this.shop.createProduct(userId, b); }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard)
  updateProduct(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() b: Record<string, unknown>) { return this.shop.updateProduct(userId, id, b); }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard)
  deleteProduct(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.shop.deleteProduct(userId, id); }

  // ── Mã giảm giá (seller) ──
  @Get('me/coupons')
  @UseGuards(JwtAuthGuard)
  myCoupons(@CurrentUser('id') userId: string) { return this.shop.myCoupons(userId); }

  @Post('coupons')
  @UseGuards(JwtAuthGuard)
  createCoupon(@CurrentUser('id') userId: string, @Body() b: any) { return this.shop.createCoupon(userId, b); }

  @Post('coupons/:id/toggle')
  @UseGuards(JwtAuthGuard)
  toggleCoupon(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.shop.toggleCoupon(userId, id); }

  @Delete('coupons/:id')
  @UseGuards(JwtAuthGuard)
  deleteCoupon(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.shop.deleteCoupon(userId, id); }

  @Post('coupons/validate')
  validateCoupon(@Body() b: { storefrontId: string; code: string }) { return this.shop.validateCoupon(b.storefrontId, b.code); }

  // ── Ticket hỗ trợ ──
  @Post('storefronts/:id/tickets')
  @UseGuards(JwtAuthGuard)
  createTicket(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() b: { subject: string; body: string }) {
    return this.shop.createTicket(userId, id, b.subject, b.body);
  }

  @Get('me/tickets')
  @UseGuards(JwtAuthGuard)
  myTickets(@CurrentUser('id') userId: string) { return this.shop.myTickets(userId); }

  @Get('me/shop/tickets')
  @UseGuards(JwtAuthGuard)
  shopTickets(@CurrentUser('id') userId: string, @Query('status') status?: string) { return this.shop.shopTickets(userId, status); }

  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard)
  ticketDetail(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.shop.ticketDetail(userId, id); }

  @Post('tickets/:id/reply')
  @UseGuards(JwtAuthGuard)
  replyTicket(@CurrentUser('id') userId: string, @Param('id') id: string, @Body('body') body: string) { return this.shop.replyTicket(userId, id, body); }

  @Post('tickets/:id/close')
  @UseGuards(JwtAuthGuard)
  closeTicket(@CurrentUser('id') userId: string, @Param('id') id: string) { return this.shop.closeTicket(userId, id); }

  // ── Public ──
  @Get('storefronts')
  list(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('q') q?: string,
  ) {
    return this.marketplace.listStorefronts(Number(page), Number(limit), q);
  }

  @Get('storefronts/:slug')
  @UseGuards(OptionalJwtGuard)
  getOne(@Param('slug') slug: string, @CurrentUser('id') viewerId?: string) {
    return this.marketplace.getStorefront(slug, viewerId);
  }

  // ── Seller dashboard ──
  @Get('me/storefront')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser('id') userId: string) {
    return this.marketplace.myStorefront(userId);
  }

  @Post('storefront')
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') userId: string, @Body() dto: CreateStorefrontDto) {
    return this.marketplace.createStorefront(userId, dto);
  }

  @Patch('storefront')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser('id') userId: string, @Body() dto: UpdateStorefrontDto) {
    return this.marketplace.updateStorefront(userId, dto);
  }

  // ── Follow ──
  @Post('storefronts/:id/follow')
  @UseGuards(JwtAuthGuard)
  follow(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.marketplace.follow(userId, id);
  }

  @Delete('storefronts/:id/follow')
  @UseGuards(JwtAuthGuard)
  unfollow(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.marketplace.unfollow(userId, id);
  }
}
