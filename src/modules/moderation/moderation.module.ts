import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { PrisonService } from './prison.service';
import { PrisonController } from './prison.controller';
import { ModAdminService } from './mod-admin.service';
import { ModAdminController } from './mod-admin.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [ModerationService, PrisonService, ModAdminService],
  controllers: [ModerationController, PrisonController, ModAdminController],
  exports: [ModerationService, PrisonService],
})
export class ModerationModule {}
