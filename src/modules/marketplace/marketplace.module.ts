import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceShopService } from './marketplace-shop.service';
import { MarketplaceOrderService } from './marketplace-order.service';
import { SellerService } from './seller.service';
import { MarketplaceController } from './marketplace.controller';
import { GemModule } from '../gem/gem.module';

@Module({
  imports: [GemModule],
  providers: [MarketplaceService, MarketplaceShopService, MarketplaceOrderService, SellerService],
  controllers: [MarketplaceController],
  exports: [MarketplaceService, MarketplaceShopService, MarketplaceOrderService, SellerService],
})
export class MarketplaceModule {}
