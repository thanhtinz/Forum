import { Module } from '@nestjs/common';
import { ForumService } from './forum.service';
import { HiddenContentModule } from '../hidden-content/hidden-content.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GameModule } from '../game/game.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [HiddenContentModule, NotificationsModule, GameModule, ModerationModule],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
