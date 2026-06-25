import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ThreadPrefix, UserRole } from '@prisma/client';
import {
  ForumService,
  CreateThreadDto,
  CreatePostDto,
  CategoryDto,
} from './forum.service';
import { PollService, CreatePollDto } from './poll.service';
import { SubscriptionService } from './subscription.service';
import { DraftService, SaveDraftDto } from './draft.service';
import { ForumTextService } from './forum-text.service';
import { BookmarkService } from './bookmark.service';
import { TipService } from './tip.service';
import { InviteService, CreateInviteCodeDto } from './invite.service';
import { ReadingProgressService } from './reading-progress.service';
import { TagService } from './tag.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';
import { PermissionsGuard, RequirePermission } from '../permissions/permissions.guard';

@Controller('forum')
export class ForumController {
  constructor(
    private readonly forum: ForumService,
    private readonly polls: PollService,
    private readonly subs: SubscriptionService,
    private readonly drafts: DraftService,
    private readonly text: ForumTextService,
    private readonly bookmarks: BookmarkService,
    private readonly tips: TipService,
    private readonly invites: InviteService,
    private readonly readingProgress: ReadingProgressService,
    private readonly tags: TagService,
  ) {}

  @Get('categories')
  categories() {
    return this.forum.listCategories();
  }

  // Tiền tố của 1 danh mục (công khai — để form đăng bài hiển thị)
  @Get('categories/:id/prefixes')
  categoryPrefixes(@Param('id') id: string) {
    return this.forum.listCategoryPrefixes(id);
  }

  // ── Admin: tiền tố bài viết theo danh mục ──
  @Post('admin/categories/:id/prefixes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createCategoryPrefix(@Param('id') id: string, @Body() dto: { label: string; color?: string; sortOrder?: number }) {
    return this.forum.createCategoryPrefix(id, dto);
  }

  @Post('admin/prefixes/:prefixId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateCategoryPrefix(@Param('prefixId') prefixId: string, @Body() dto: { label?: string; color?: string; sortOrder?: number }) {
    return this.forum.updateCategoryPrefix(prefixId, dto);
  }

  @Delete('admin/prefixes/:prefixId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteCategoryPrefix(@Param('prefixId') prefixId: string) {
    return this.forum.deleteCategoryPrefix(prefixId);
  }

  // ── Admin: quản lý danh mục (CRUD + cờ module) ──
  @Get('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminListCategories() {
    return this.forum.adminListCategories();
  }

  @Post('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createCategory(@Body() dto: CategoryDto) {
    return this.forum.createCategory(dto);
  }

  @Post('admin/tags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createTag(@Body() dto: { name: string; color?: string }) {
    return this.tags.createTag(dto.name, dto.color);
  }

  @Delete('admin/tags/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteTag(@Param('id') id: string) {
    return this.tags.deleteTag(id);
  }

  @Post('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateCategory(@Param('id') id: string, @Body() dto: CategoryDto) {
    return this.forum.updateCategory(id, dto);
  }

  @Delete('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteCategory(@Param('id') id: string) {
    return this.forum.deleteCategory(id);
  }

  // ── Tags (theo dõi thẻ) ──
  // Đặt route có path riêng cho danh sách thẻ đang theo dõi để tránh đụng tags/:slug
  @Get('my/followed-tags')
  @UseGuards(JwtAuthGuard)
  followedTags(@CurrentUser('id') userId: string) {
    return this.tags.listFollowed(userId);
  }

  @Get('tags')
  @UseGuards(OptionalJwtGuard)
  listTags(
    @CurrentUser('id') userId: string | undefined,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
  ) {
    return this.tags.listTags({ q, limit: limit ? Number(limit) : undefined, userId });
  }

  @Get('tags/:slug')
  @UseGuards(OptionalJwtGuard)
  getTag(@Param('slug') slug: string, @CurrentUser('id') userId?: string) {
    return this.tags.getTag(slug, userId);
  }

  @Get('tags/:tagId/threads')
  threadsForTag(
    @Param('tagId') tagId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.tags.threadsForTag(tagId, Number(page), Number(limit));
  }

  @Post('tags/:tagId/follow')
  @UseGuards(JwtAuthGuard)
  followTag(@Param('tagId') tagId: string, @CurrentUser('id') userId: string) {
    return this.tags.toggleFollow(userId, tagId);
  }

  // Bài viết (post/reply) gần đây của 1 user — cho tab "Hoạt động mới nhất"
  @Get('users/:userId/posts')
  listUserPosts(@Param('userId') userId: string, @Query('limit') limit = 20) {
    return this.forum.listUserPosts(userId, Number(limit));
  }

  // ── Threads ──
  @Get('threads')
  listThreads(
    @Query('categoryId') categoryId?: string,
    @Query('prefix') prefix?: ThreadPrefix,
    @Query('tagId') tagId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sortBy') sortBy?: 'lastPost' | 'createdAt' | 'views' | 'likes' | 'replies',
    @Query('unanswered') unanswered?: string,
    @Query('q') q?: string,
    @Query('authorId') authorId?: string,
  ) {
    return this.forum.getThreadList({
      categoryId, prefix, tagId, page: Number(page), limit: Number(limit), sortBy,
      unanswered: unanswered === '1' || unanswered === 'true',
      q, authorId,
    });
  }

  @Get('threads/:slug')
  @UseGuards(OptionalJwtGuard)
  getThread(@Param('slug') slug: string, @CurrentUser('id') userId?: string) {
    return this.forum.getThread(slug, userId);
  }

  @Post('threads')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('forum.startThread')
  createThread(@CurrentUser('id') userId: string, @Body() dto: CreateThreadDto) {
    return this.forum.createThread(dto, userId);
  }

  @Get('threads/:threadId/posts')
  @UseGuards(OptionalJwtGuard)
  getPosts(
    @Param('threadId') threadId: string,
    @CurrentUser('id') userId: string | undefined,
    @CurrentUser('role') role: UserRole | undefined,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const isMod = role === UserRole.ADMIN || role === UserRole.MODERATOR;
    return this.forum.getPostsForThread(threadId, userId ?? null, Number(page), Number(limit), isMod);
  }

  // ── Posts ──
  @Post('posts')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('forum.reply')
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('mod.lockThread')
  pin(@Param('id') id: string, @Body('pin') pin = true) {
    return this.forum.pinThread(id, pin);
  }

  @Post('threads/:id/lock')
  @UseGuards(JwtAuthGuard)
  lock(@Param('id') id: string, @Body('lock') lock = true, @CurrentUser('id') userId?: string, @CurrentUser('role') role?: string) {
    return this.forum.lockThread(id, lock, userId, role);
  }

  @Post('threads/:id/hide')
  @UseGuards(JwtAuthGuard)
  hide(@Param('id') id: string, @Body('hide') hide = true, @CurrentUser('id') userId?: string, @CurrentUser('role') role?: string) {
    return this.forum.hideThread(id, hide, userId, role);
  }

  @Post('threads/:id/move')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('mod.lockThread')
  move(@Param('id') id: string, @Body('categoryId') categoryId: string) {
    return this.forum.moveThread(id, categoryId);
  }

  @Post('threads/:id/merge')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('mod.lockThread')
  merge(@Param('id') sourceId: string, @Body('targetId') targetId: string) {
    return this.forum.mergeThreads(sourceId, targetId);
  }

  @Post('threads/:id/split')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('mod.lockThread')
  split(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { postIds: string[]; title: string; categoryId?: string },
  ) {
    return this.forum.splitThread(id, body.postIds, body.title, userId, body.categoryId);
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

  // ── Tip/Donate bằng gem ──
  @Post('posts/:id/tip')
  @UseGuards(JwtAuthGuard)
  tipPost(@Param('id') postId: string, @CurrentUser('id') userId: string, @Body() b: { amount: number; message?: string }) {
    return this.tips.tipPost(postId, userId, Number(b.amount), b.message);
  }

  @Get('tips/received')
  @UseGuards(JwtAuthGuard)
  tipsReceived(@CurrentUser('id') userId: string) {
    return this.tips.listReceived(userId);
  }

  // ── Bookmarks (lưu chủ đề) ──
  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  myBookmarks(@CurrentUser('id') userId: string) {
    return this.bookmarks.listMine(userId);
  }

  @Get('threads/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  bookmarkState(@Param('id') threadId: string, @CurrentUser('id') userId: string) {
    return this.bookmarks.isBookmarked(threadId, userId);
  }

  @Post('threads/:id/bookmark')
  @UseGuards(JwtAuthGuard)
  toggleBookmark(@Param('id') threadId: string, @CurrentUser('id') userId: string, @Body('note') note?: string) {
    return this.bookmarks.toggle(threadId, userId, note);
  }

  // ── Approval queue (FoF Approval) ──
  @Get('admin/approval')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  approvalQueue() {
    return this.forum.listPendingApproval();
  }

  @Post('admin/approval/thread/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  approveThread(@Param('id') id: string) {
    return this.forum.approveThread(id);
  }

  @Post('admin/approval/post/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  approvePost(@Param('id') id: string) {
    return this.forum.approvePost(id);
  }

  @Delete('admin/approval/:kind/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  rejectContent(@Param('kind') kind: 'thread' | 'post', @Param('id') id: string) {
    return this.forum.rejectContent(kind, id);
  }

  @Get('admin/approval-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  getApprovalConfig() {
    return this.forum.getApprovalConfig();
  }

  @Post('admin/approval-config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  setApprovalConfig(@Body('threshold') threshold: number) {
    return this.forum.setApprovalConfig(Number(threshold));
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

  // ── Reading Progress (tiến trình đọc) ──
  @Post('threads/:threadId/read-progress')
  @UseGuards(JwtAuthGuard)
  markReadProgress(
    @Param('threadId') threadId: string,
    @CurrentUser('id') userId: string,
    @Body('postId') postId: string,
  ) {
    return this.readingProgress.markRead(userId, threadId, postId);
  }

  @Get('threads/:threadId/read-progress')
  @UseGuards(JwtAuthGuard)
  getReadProgress(
    @Param('threadId') threadId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.readingProgress.getProgress(userId, threadId);
  }

  @Post('read-progress/bulk')
  @UseGuards(JwtAuthGuard)
  getBulkReadProgress(
    @CurrentUser('id') userId: string,
    @Body('threadIds') threadIds: string[],
  ) {
    return this.readingProgress.getBulkUnreadCounts(userId, threadIds || []);
  }

  @Post('read-progress/mark-all')
  @UseGuards(JwtAuthGuard)
  markAllRead(@CurrentUser('id') userId: string) {
    return this.readingProgress.markAllRead(userId);
  }

  // ── Admin: Invite Codes (Mã mời) ──
  @Get('admin/invite-codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  listInviteCodes() {
    return this.invites.listCodes();
  }

  @Post('admin/invite-codes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createInviteCode(@CurrentUser('id') userId: string, @Body() dto: CreateInviteCodeDto) {
    return this.invites.createCode(userId, dto);
  }

  @Delete('admin/invite-codes/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteInviteCode(@Param('id') id: string) {
    return this.invites.deleteCode(id);
  }

  // ── Redeem invite code (authenticated user) ──
  @Post('invite-codes/redeem')
  @UseGuards(JwtAuthGuard)
  redeemInviteCode(@CurrentUser('id') userId: string, @Body('code') code: string) {
    return this.invites.redeemCode(userId, code);
  }

  // ── Edit post (sửa bài viết) ──
  @Patch('posts/:id')
  @UseGuards(JwtAuthGuard)
  editPost(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Body('content') content: string,
    @Body('reason') reason?: string,
  ) {
    return this.forum.editPost(postId, userId, content, reason, role);
  }

  // ── Post edit history (lịch sử chỉnh sửa) ──
  @Get('posts/:id/history')
  @UseGuards(JwtAuthGuard)
  getPostEditHistory(@Param('id') postId: string) {
    return this.forum.getPostEditHistory(postId);
  }

  // ── Move post to another thread ──
  @Post('posts/:id/move')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('mod.lockThread')
  movePost(
    @Param('id') postId: string,
    @CurrentUser('id') userId: string,
    @Body('targetThreadId') targetThreadId: string,
  ) {
    return this.forum.movePost(postId, targetThreadId, userId);
  }

  // ── Thread reply bans ──
  @Post('threads/:id/reply-ban')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('mod.lockThread')
  banReply(
    @Param('id') threadId: string,
    @CurrentUser('id') modId: string,
    @Body() body: { userId: string; reason?: string; expiresAt?: string },
  ) {
    return this.forum.banReply(threadId, body.userId, modId, body.reason, body.expiresAt ? new Date(body.expiresAt) : undefined);
  }

  @Delete('threads/:id/reply-ban/:userId')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('mod.lockThread')
  unbanReply(@Param('id') threadId: string, @Param('userId') userId: string) {
    return this.forum.unbanReply(threadId, userId);
  }

  @Get('threads/:id/reply-bans')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission('mod.lockThread')
  getThreadReplyBans(@Param('id') threadId: string) {
    return this.forum.getThreadReplyBans(threadId);
  }

  // ── Batch moderation ──
  @Post('admin/batch/posts/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  batchDeletePosts(@CurrentUser('id') userId: string, @Body('postIds') postIds: string[]) {
    return this.forum.batchDeletePosts(postIds || [], userId);
  }

  @Post('admin/batch/posts/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  batchApprovePosts(@Body('postIds') postIds: string[]) {
    return this.forum.batchApprovePosts(postIds || []);
  }

  @Post('admin/batch/threads/move')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  batchMoveThreads(@Body('threadIds') threadIds: string[], @Body('categoryId') categoryId: string) {
    return this.forum.batchMoveThreads(threadIds || [], categoryId);
  }

  @Post('admin/batch/threads/delete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  batchDeleteThreads(@CurrentUser('id') userId: string, @Body('threadIds') threadIds: string[]) {
    return this.forum.batchDeleteThreads(threadIds || [], userId);
  }

  // ── Warnings ──
  @Post('admin/warn/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  warnUser(
    @Param('userId') userId: string,
    @CurrentUser('id') warnedById: string,
    @Body() body: { reason: string; points?: number; postId?: string; threadId?: string; expiresAt?: string },
  ) {
    return this.forum.warnUser({
      userId,
      warnedById,
      reason: body.reason,
      points: body.points,
      postId: body.postId,
      threadId: body.threadId,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
  }

  @Get('admin/warnings/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MODERATOR)
  getUserWarnings(@Param('userId') userId: string) {
    return this.forum.getUserWarnings(userId);
  }
}
