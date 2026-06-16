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
import { ThreadPrefix, UserRole } from '@prisma/client';
import {
  ForumService,
  CreateThreadDto,
  CreatePostDto,
} from './forum.service';
import { PollService, CreatePollDto } from './poll.service';
import { SubscriptionService } from './subscription.service';
import { DraftService, SaveDraftDto } from './draft.service';
import { ForumTextService } from './forum-text.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('forum')
export class ForumController {
  constructor(
    private readonly forum: ForumService,
    private readonly polls: PollService,
    private readonly subs: SubscriptionService,
    private readonly drafts: DraftService,
    private readonly text: ForumTextService,
  ) {}

  @Get('categories')
  categories() {
    return this.forum.listCategories();
  }

  // ── Threads ──
  @Get('threads')
  listThreads(
    @Query('categoryId') categoryId?: string,
    @Query('prefix') prefix?: ThreadPrefix,
    @Query('tagId') tagId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sortBy') sortBy?: 'lastPost' | 'createdAt' | 'views' | 'likes',
  ) {
    return this.forum.getThreadList({
      categoryId, prefix, tagId, page: Number(page), limit: Number(limit), sortBy,
    });
  }

  @Get('threads/:slug')
  @UseGuards(OptionalJwtGuard)
  getThread(@Param('slug') slug: string, @CurrentUser('id') userId?: string) {
    return this.forum.getThread(slug, userId);
  }

  @Post('threads')
  @UseGuards(JwtAuthGuard)
  createThread(@CurrentUser('id') userId: string, @Body() dto: CreateThreadDto) {
    return this.forum.createThread(dto, userId);
  }

  @Get('threads/:threadId/posts')
  @UseGuards(OptionalJwtGuard)
  getPosts(
    @Param('threadId') threadId: string,
    @CurrentUser('id') userId: string | undefined,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.forum.getPostsForThread(threadId, userId ?? null, Number(page), Number(limit));
  }

  // ── Posts ──
  @Post('posts')
  @UseGuards(JwtAuthGuard)
  createPost(@CurrentUser('id') userId: string, @Body() dto: CreatePostDto) {
    return this.forum.createPost(dto, userId);
  }

  @Post('posts/:id/react')
  @UseGuards(JwtAuthGuard)
  react(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body('emoji') emoji = 'like',
  ) {
    return this.forum.reactToPost(postId, userId, emoji);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  deletePost(
    @CurrentUser('id') userId: string,
    @Param('id') postId: string,
    @Body('reason') reason?: string,
  ) {
    return this.forum.deletePost(postId, userId, reason);
  }

  // ── Mod actions ──
  @Post('threads/:id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  pin(@Param('id') id: string, @Body('pin') pin = true) {
    return this.forum.pinThread(id, pin);
  }

  @Post('threads/:id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  lock(@Param('id') id: string, @Body('lock') lock = true) {
    return this.forum.lockThread(id, lock);
  }

  // ── Best Answer (Q&A) ──
  @Post('threads/:id/best-answer')
  @UseGuards(JwtAuthGuard)
  bestAnswer(
    @Param('id') threadId: string,
    @Body('postId') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    return this.forum.toggleBestAnswer(threadId, postId, userId, role);
  }

  // ── Polls (FoF Polls) ──
  @Get('threads/:threadId/poll')
  @UseGuards(OptionalJwtGuard)
  getPoll(@Param('threadId') threadId: string, @CurrentUser('id') userId?: string) {
    return this.polls.getForThread(threadId, userId);
  }

  @Post('threads/:threadId/poll')
  @UseGuards(JwtAuthGuard)
  createPoll(@Param('threadId') threadId: string, @CurrentUser('id') userId: string, @Body() dto: CreatePollDto) {
    return this.polls.createForThread(threadId, userId, dto);
  }

  @Post('polls/:pollId/vote')
  @UseGuards(JwtAuthGuard)
  vote(@Param('pollId') pollId: string, @CurrentUser('id') userId: string, @Body('optionIds') optionIds: string[]) {
    return this.polls.vote(pollId, userId, optionIds || []);
  }

  // ── Subscriptions (theo dõi thread) ──
  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  mySubs(@CurrentUser('id') userId: string) {
    return this.subs.listMine(userId);
  }

  @Get('threads/:id/subscription')
  @UseGuards(JwtAuthGuard)
  subState(@Param('id') threadId: string, @CurrentUser('id') userId: string) {
    return this.subs.isSubscribed(threadId, userId).then((subscribed) => ({ subscribed }));
  }

  @Post('threads/:id/subscribe')
  @UseGuards(JwtAuthGuard)
  toggleSub(@Param('id') threadId: string, @CurrentUser('id') userId: string) {
    return this.subs.toggle(threadId, userId);
  }

  // ── Drafts (FoF Drafts) ──
  @Get('drafts')
  @UseGuards(JwtAuthGuard)
  listDrafts(@CurrentUser('id') userId: string) {
    return this.drafts.list(userId);
  }

  @Post('drafts')
  @UseGuards(JwtAuthGuard)
  saveDraft(@CurrentUser('id') userId: string, @Body() dto: SaveDraftDto) {
    return this.drafts.save(userId, dto);
  }

  @Delete('drafts/:id')
  @UseGuards(JwtAuthGuard)
  deleteDraft(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.drafts.remove(id, userId);
  }

  // ── Admin: ngưỡng tự chọn câu trả lời hay nhất theo reaction ──
  @Get('admin/auto-best')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  getAutoBest() {
    return this.forum.getAutoBestConfig();
  }

  @Post('admin/auto-best')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  setAutoBest(@Body('threshold') threshold: number) {
    return this.forum.setAutoBestConfig(Number(threshold));
  }

  // ── Admin: quản lý từ cấm (FoF Filter) ──
  @Get('admin/censor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  getCensor() {
    return this.text.getCensorList().then((words) => ({ words }));
  }

  @Post('admin/censor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  setCensor(@Body('words') words: string[]) {
    return this.text.setCensorList(words || []).then((w) => ({ words: w }));
  }
}
