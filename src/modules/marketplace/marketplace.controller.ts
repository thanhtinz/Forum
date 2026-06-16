import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceShopService } from './marketplace-shop.service';
import { MarketplaceOrderService } from './marketplace-order.service';
import { SellerService } from './seller.service';
import { SellerPerkService } from './seller-perk.service';
import { StoreStaffService } from './store-staff.service';
import { CreateStorefrontDto, UpdateStorefrontDto } from './marketplace.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplace: MarketplaceService,
    private readonly shop: MarketplaceShopService,
    private readonly orders: MarketplaceOrderService,
    private readonly seller: SellerService,
    private readonly perks: SellerPerkService,
    private readonly staff: StoreStaffService,
  ) {}

  // ── Nhân viên gian hàng (mục 13) ──
  @Get('seller/staff')
  @UseGuards(JwtAuthGuard)
  listStaff(@CurrentUser('id') uid: string) { return this.staff.listStaff(uid); }

  @Post('seller/staff')
  @UseGuards(JwtAuthGuard)
  addStaff(@CurrentUser('id') uid: string, @Body() b: { username: string; role: string; permissions: string[] }) {
    return this.staff.addStaff(uid, b.username, b.role || 'STAFF', b.permissions || []);
  }

  @Delete('seller/staff/:id')
  @UseGuards(JwtAuthGuard)
  removeStaff(@CurrentUser('id') uid: string, @Param('id') id: string) { return this.staff.removeStaff(uid, id); }

  // ── Nhật ký hoạt động (mục 20) ──
  @Get('seller/activity')
  @UseGuards(JwtAuthGuard)
  activity(@CurrentUser('id') uid: string, @Query('page') page = 1) { return this.staff.activity(uid, Number(page)); }

  // ── Dịch vụ trả phí (gem) — mua trong Seller Dashboard ──
  @Get('seller/perks')
  @UseGuards(JwtAuthGuard)
  myPerks(@CurrentUser('id') uid: string) { return this.perks.myPerks(uid); }

  @Post('seller/perks/product/:id')
  @UseGuards(JwtAuthGuard)
  buyProductPerk(@CurrentUser('id') uid: string, @Param('id') id: string, @Body() b: { kind: 'pin' | 'feature'; dur: 'd1' | 'd7' | 'd30' }) {
    return this.perks.buyProductPerk(uid, id, b.kind, b.dur);
  }

  @Post('seller/perks/store')
  @UseGuards(JwtAuthGuard)
  buyStoreFeature(@CurrentUser('id') uid: string, @Body('dur') dur: 'd1' | 'd7' | 'd30') { return this.perks.buyStoreFeature(uid, dur); }

  @Post('seller/perks/ai')
  @UseGuards(JwtAuthGuard)
  buyAi(@CurrentUser('id') uid: string, @Body('plan') plan: 'month' | 'forever') { return this.perks.buyAi(uid, plan); }

  // Admin cấu hình giá dịch vụ
  @Get('admin/perk-config')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  perkConfig() { return this.perks.getConfig(); }

  @Put('admin/perk-config')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  setPerkConfig(@Body() b: any) { return this.perks.setConfig(b); }

  // ── SELLER CENTER ──
  @Get('seller/dashboard')
  @UseGuards(JwtAuthGuard)
  sellerDashboard(@CurrentUser('id') uid: string) { return this.seller.dashboard(uid); }

  @Get('seller/wallet')
  @UseGuards(JwtAuthGuard)
  sellerWallet(@CurrentUser('id') uid: string) { return this.seller.wallet(uid); }

  @Get('seller/reviews')
  @UseGuards(JwtAuthGuard)
  sellerReviews(@CurrentUser('id') uid: string) { return this.seller.reviews(uid); }

  @Post('seller/ai')
  @UseGuards(JwtAuthGuard)
  sellerAi(@CurrentUser('id') uid: string, @Body() b: { task: string; input: string }) { return this.seller.aiAssist(uid, b.task, b.input); }

  @Post('reviews/:id/reply')
  @UseGuards(JwtAuthGuard)
  replyReview(@CurrentUser('id') uid: string, @Param('id') id: string, @Body('reply') reply: string) { return this.seller.replyReview(uid, id, reply); }

  // Kho hàng (giao tự động)
  @Get('products/:id/stock')
  @UseGuards(JwtAuthGuard)
  listStock(@CurrentUser('id') uid: string, @Param('id') id: string) { return this.seller.listStock(uid, id); }

  @Post('products/:id/stock')
  @UseGuards(JwtAuthGuard)
  addStock(@CurrentUser('id') uid: string, @Param('id') id: string, @Body('lines') lines: string[]) { return this.seller.addStock(uid, id, lines || []); }

  @Delete('stock/:id')
  @UseGuards(JwtAuthGuard)
  deleteStock(@CurrentUser('id') uid: string, @Param('id') id: string) { return this.seller.deleteStock(uid, id); }

  @Post('products/:id/duplicate')
  @UseGuards(JwtAuthGuard)
  duplicate(@CurrentUser('id') uid: string, @Param('id') id: string) { return this.seller.duplicateProduct(uid, id); }

  // Rút tiền
  @Get('seller/payout-methods')
  @UseGuards(JwtAuthGuard)
  payoutMethods(@CurrentUser('id') uid: string) { return this.seller.payoutMethods(uid); }

  @Post('seller/payout-methods')
  @UseGuards(JwtAuthGuard)
  addPayout(@CurrentUser('id') uid: string, @Body() b: { type: string; label: string; detail: string }) { return this.seller.addPayoutMethod(uid, b); }

  @Delete('seller/payout-methods/:id')
  @UseGuards(JwtAuthGuard)
  delPayout(@CurrentUser('id') uid: string, @Param('id') id: string) { return this.seller.deletePayoutMethod(uid, id); }

  @Get('seller/withdrawals')
  @UseGuards(JwtAuthGuard)
  withdrawals(@CurrentUser('id') uid: string) { return this.seller.withdrawals(uid); }

  @Post('seller/withdrawals')
  @UseGuards(JwtAuthGuard)
  requestWithdrawal(@CurrentUser('id') uid: string, @Body() b: { amount: number; methodId: string }) { return this.seller.requestWithdrawal(uid, Number(b.amount), b.methodId); }

  // ── Mua hàng + escrow (giam 3 ngày) ──
  @Post('products/:id/buy')
  @UseGuards(JwtAuthGuard)
  buy(@CurrentUser('id') userId: string, @Param('id') id: string, @Body('couponCode') couponCode?: string) {
    return this.orders.buy(userId, id, couponCode);
  }

  @Get('me/purchases')
  @UseGuards(JwtAuthGuard)
  myPurchases(@CurrentUser('id') userId: string) { return this.orders.myPurchases(userId); }

  @Get('me/earnings')
  @UseGuards(JwtAuthGuard)
  myEarnings(@CurrentUser('id') userId: string) { return this.orders.sellerEarnings(userId); }

  @Get('seller/orders')
  @UseGuards(JwtAuthGuard)
  sellerOrders(@CurrentUser('id') userId: string) { return this.orders.sellerOrders(userId); }

  @Post('orders/:id/deliver')
  @UseGuards(JwtAuthGuard)
  deliverManual(@CurrentUser('id') userId: string, @Param('id') id: string, @Body('content') content: string) { return this.orders.deliverManual(userId, id, content); }

  // Admin duyệt rút tiền
  @Get('admin/withdrawals')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminWithdrawals(@Query('status') status?: string) { return this.orders.adminWithdrawals(status); }

  @Post('admin/withdrawals/:id/:action')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  processWithdrawal(@Param('id') id: string, @Param('action') action: 'approve' | 'paid' | 'reject') { return this.orders.adminProcessWithdrawal(id, action); }

  // ── ADMIN — quản lý toàn bộ chợ ──
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminStats() { return this.orders.adminStats(); }

  @Get('admin/storefronts')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminStorefronts(@Query('q') q?: string) { return this.orders.adminStorefronts(q); }

  @Post('admin/storefronts/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminToggleStore(@Param('id') id: string, @Body('field') field: 'isVerified' | 'isActive') { return this.orders.adminToggleStorefront(id, field); }

  @Get('admin/products')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminProducts(@Query('q') q?: string) { return this.orders.adminProducts(q); }

  @Post('admin/products/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminProductStatus(@Param('id') id: string, @Body('status') status: 'ACTIVE' | 'SUSPENDED' | 'DRAFT') { return this.orders.adminSetProductStatus(id, status); }

  @Get('admin/orders')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminOrders(@Query('status') status?: string) { return this.orders.adminOrders(status); }

  @Post('admin/orders/:id/release')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminRelease(@Param('id') id: string) { return this.orders.adminReleaseOrder(id); }

  @Post('admin/orders/:id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminRefund(@Param('id') id: string, @Body('reason') reason?: string) { return this.orders.adminRefundOrder(id, reason); }

  @Get('admin/tickets')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminTickets(@Query('status') status?: string) { return this.orders.adminTickets(status); }

  @Get('admin/coupons')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles(UserRole.ADMIN)
  adminCoupons() { return this.orders.adminCoupons(); }

  // ── Danh mục (public + admin) ──
  @Get('categories')
  categories() { return this.shop.listCategories(); }

  @Get('featured')
  featured() { return this.shop.featured(); }

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
