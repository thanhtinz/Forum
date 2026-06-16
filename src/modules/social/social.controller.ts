import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FollowService } from './follow.service';
import { ProfilePostService } from './profile-post.service';
import { FeedService } from './feed.service';
import { MembersService, MemberSortBy } from './members.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('social')
export class SocialController {
  constructor(
    private readonly follow: FollowService,
    private readonly profilePosts: ProfilePostService,
    private readonly feed: FeedService,
    private readonly members: MembersService,
  ) {}

  // ── Follow ──
  @Post('follow/:userId')
  @UseGuards(JwtAuthGuard)
  toggleFollow(@CurrentUser('id') userId: string, @Param('userId') target: string) {
    return this.follow.toggle(userId, target);
  }

  @Get('users/:userId/follow-state')
  @UseGuards(JwtAuthGuard)
  followState(@CurrentUser('id') userId: string, @Param('userId') target: string) {
    return this.follow
      .isFollowing(userId, target)
      .then((following) => ({ following }));
  }

  @Get('users/:userId/followers')
  followers(@Param('userId') userId: string) {
    return this.follow.listFollowers(userId);
  }

  @Get('users/:userId/following')
  following(@Param('userId') userId: string) {
    return this.follow.listFollowing(userId);
  }

  @Get('users/:userId/follow-counts')
  followCounts(@Param('userId') userId: string) {
    return this.follow.counts(userId);
  }

  // ── Wall / Profile posts ──
  @Get('wall/:userId')
  wall(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.profilePosts.list(userId, Number(page), Number(limit));
  }

  @Post('wall/:userId')
  @UseGuards(JwtAuthGuard)
  postToWall(
    @CurrentUser('id') authorId: string,
    @Param('userId') wallId: string,
    @Body('content') content: string,
  ) {
    return this.profilePosts.create(authorId, wallId, content);
  }

  @Post('profile-posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  comment(
    @CurrentUser('id') authorId: string,
    @Param('id') postId: string,
    @Body('content') content: string,
  ) {
    return this.profilePosts.addComment(postId, authorId, content);
  }

  @Delete('profile-posts/:id')
  @UseGuards(JwtAuthGuard)
  removePost(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Param('id') postId: string,
  ) {
    return this.profilePosts.remove(postId, userId, role);
  }

  @Post('profile-posts/:id/like')
  @UseGuards(JwtAuthGuard)
  likePost(@CurrentUser('id') userId: string, @Param('id') postId: string) {
    return this.profilePosts.like(postId, userId);
  }

  // ── Feed ──
  @Get('feed')
  @UseGuards(JwtAuthGuard)
  getFeed(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.feed.getFeed(userId, Number(page), Number(limit));
  }

  // ── Members directory ──
  @Get('members')
  listMembers(
    @Query('page') page = 1,
    @Query('limit') limit = 24,
    @Query('sortBy') sortBy?: MemberSortBy,
    @Query('q') q?: string,
  ) {
    return this.members.list({ page: Number(page), limit: Number(limit), sortBy, q });
  }
}
