import { Module, Global } from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminShopService } from './admin-shop.service';
import { AdminGameAssetService } from './admin-game-asset.service';
import { AdminController } from './admin.controller';

@Global()
@Module({
  controllers: [AdminController],
  providers: [AdminConfigService, AdminDashboardService, AdminShopService, AdminGameAssetService],
  exports: [AdminConfigService, AdminDashboardService, AdminShopService, AdminGameAssetService],
})
export class AdminModule {}
