import { Module } from '@nestjs/common';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';
import { PollService } from './poll.service';
import { SubscriptionService } from './subscription.service';
import { DraftService } from './draft.service';
import { ForumTextService } from './forum-text.service';
import { HiddenContentModule } from '../hidden-content/hidden-content.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GameModule } from '../game/game.module';
import { ModerationModule } from '../moderation/moderation.module';

@Module({
  imports: [HiddenContentModule, NotificationsModule, GameModule, ModerationModule],
  controllers: [ForumController],
  providers: [ForumService, PollService, SubscriptionService, DraftService, ForumTextService],
  exports: [ForumService],
})
export class ForumModule {}
