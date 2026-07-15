import { Module, Global } from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminShopService } from './admin-shop.service';
import { AdminGameAssetService } from './admin-game-asset.service';
import { AdminTemplateService } from './admin-template.service';
import { AdminBackupService } from './admin-backup.service';
import { AdminController } from './admin.controller';
import { PublicConfigController } from './public-config.controller';
import { MediaModule } from '../media/media.module';

@Global()
@Module({
  imports: [MediaModule],
  controllers: [AdminController, PublicConfigController],
  providers: [AdminConfigService, AdminDashboardService, AdminShopService, AdminGameAssetService, AdminTemplateService, AdminBackupService],
  exports: [AdminConfigService, AdminDashboardService, AdminShopService, AdminGameAssetService, AdminTemplateService, AdminBackupService],
})
export class AdminModule {}
