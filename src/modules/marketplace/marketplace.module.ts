import { Module } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceShopService } from './marketplace-shop.service';
import { MarketplaceController } from './marketplace.controller';

@Module({
  providers: [MarketplaceService, MarketplaceShopService],
  controllers: [MarketplaceController],
  exports: [MarketplaceService, MarketplaceShopService],
})
export class MarketplaceModule {}
