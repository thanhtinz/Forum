import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceShopService } from './marketplace-shop.service';
import { MarketplaceOrderService } from './marketplace-order.service';
import { SellerService } from './seller.service';
import { SellerPerkService } from './seller-perk.service';
import { StoreStaffService } from './store-staff.service';
import { MarketplaceController } from './marketplace.controller';
import { GemModule } from '../gem/gem.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AiProviderService } from '../ai-companion/ai-provider.service';

@Module({
  imports: [GemModule, NotificationsModule],
  providers: [MarketplaceService, MarketplaceShopService, MarketplaceOrderService, SellerService, SellerPerkService, StoreStaffService, AiProviderService],
  controllers: [MarketplaceController],
  exports: [MarketplaceService, MarketplaceShopService, MarketplaceOrderService, SellerService],
})
export class MarketplaceModule {}
