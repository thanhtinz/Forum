import { Module, Global } from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminShopService } from './admin-shop.service';
import { AdminGameAssetService } from './admin-game-asset.service';
import { AdminTemplateService } from './admin-template.service';
import { AdminController } from './admin.controller';
import { PublicConfigController } from './public-config.controller';
import { VipModule } from '../vip/vip.module';

@Global()
@Module({
  imports: [VipModule],
  controllers: [AdminController, PublicConfigController],
  providers: [AdminConfigService, AdminDashboardService, AdminShopService, AdminGameAssetService, AdminTemplateService],
  exports: [AdminConfigService, AdminDashboardService, AdminShopService, AdminGameAssetService, AdminTemplateService],
})
export class AdminModule {}
