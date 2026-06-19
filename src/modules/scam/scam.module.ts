import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScamService } from './scam.service';
import { ScamAdminService } from './scam-admin.service';
import { ScamController } from './scam.controller';
import { ScamAdminController } from './scam-admin.controller';

@Module({
  imports: [NotificationsModule],
  providers: [ScamService, ScamAdminService],
  controllers: [ScamController, ScamAdminController],
  exports: [ScamService],
})
export class ScamModule {}
