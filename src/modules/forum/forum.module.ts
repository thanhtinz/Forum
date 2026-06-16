import { Module } from '@nestjs/common';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';
import { PollService } from './poll.service';
import { SubscriptionService } from './subscription.service';
import { DraftService } from './draft.service';
import { ForumTextService } from './forum-text.service';
import { BookmarkService } from './bookmark.service';
import { TipService } from './tip.service';
import { ReadingProgressService } from './reading-progress.service';
import { InviteService } from './invite.service';
import { TagService } from './tag.service';
import { HiddenContentModule } from '../hidden-content/hidden-content.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GameModule } from '../game/game.module';
import { ModerationModule } from '../moderation/moderation.module';
import { GemModule } from '../gem/gem.module';
import { ProfileExtraModule } from '../profile-extra/profile-extra.module';

@Module({
  imports: [HiddenContentModule, NotificationsModule, GameModule, ModerationModule, GemModule, ProfileExtraModule],
  controllers: [ForumController],
  providers: [ForumService, PollService, SubscriptionService, DraftService, ForumTextService, BookmarkService, TipService, InviteService, ReadingProgressService, TagService],
  exports: [ForumService],
})
export class ForumModule {}
