import { Module } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { PrisonService } from './prison.service';
import { PrisonController } from './prison.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [ModerationService, PrisonService],
  controllers: [ModerationController, PrisonController],
  exports: [ModerationService, PrisonService],
})
export class ModerationModule {}
