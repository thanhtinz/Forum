import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { FollowService } from './follow.service';
import { ProfilePostService } from './profile-post.service';
import { FeedService } from './feed.service';
import { MembersService } from './members.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProfileExtraModule } from '../profile-extra/profile-extra.module';

@Module({
  imports: [NotificationsModule, ProfileExtraModule],
  controllers: [SocialController],
  providers: [FollowService, ProfilePostService, FeedService, MembersService],
  exports: [FollowService, ProfilePostService, FeedService, MembersService],
})
export class SocialModule {}
