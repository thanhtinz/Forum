import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  JobCategory,
  JobBudgetType,
  JobStatus,
  JobDisputeStatus,
  UserRole,
} from '@prisma/client';
import {
  JobsService,
  CreateJobDto,
  UpdateJobDto,
  SubmitProposalDto,
} from './jobs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  // ── Public ──
  @Get()
  list(
    @Query('category') category?: JobCategory,
    @Query('budgetType') budgetType?: JobBudgetType,
    @Query('country') country?: string,
    @Query('language') language?: string,
    @Query('q') q?: string,
    @Query('minBudget') minBudget?: string,
    @Query('maxBudget') maxBudget?: string,
    @Query('status') status?: JobStatus,
    @Query('sort') sort?: 'recent' | 'budget',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.jobs.list({
      category,
      budgetType,
      country,
      language,
      q,
      minBudget: minBudget != null ? Number(minBudget) : undefined,
      maxBudget: maxBudget != null ? Number(maxBudget) : undefined,
      status,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ── Mine (đặt trước :id để tránh nuốt route) ──
  @Get('mine/posted')
  @UseGuards(JwtAuthGuard)
  myJobs(@CurrentUser('id') userId: string, @Query('status') status?: JobStatus) {
    return this.jobs.myJobs(userId, status);
  }

  @Get('mine/proposals')
  @UseGuards(JwtAuthGuard)
  myProposals(@CurrentUser('id') userId: string) {
    return this.jobs.myProposals(userId);
  }

  @Get('mine/bookmarks')
  @UseGuards(JwtAuthGuard)
  myBookmarks(@CurrentUser('id') userId: string) {
    return this.jobs.listBookmarks(userId);
  }

  // ── Admin disputes ──
  @Get('admin/disputes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminDisputes(@Query('status') status?: JobDisputeStatus) {
    return this.jobs.adminListDisputes(status);
  }

  @Post('admin/disputes/:id/resolve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminResolve(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { decision: 'refund' | 'release'; resolution?: string },
  ) {
    return this.jobs.adminResolve(id, adminId, body.decision, body.resolution);
  }

  // ── Proposal actions (path tĩnh trước :id) ──
  @Post('proposals/:id/withdraw')
  @UseGuards(JwtAuthGuard)
  withdrawProposal(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobs.withdrawProposal(id, userId);
  }

  @Post('proposals/:id/reject')
  @UseGuards(JwtAuthGuard)
  rejectProposal(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobs.rejectProposal(id, userId);
  }

  @Post('proposals/:id/hire')
  @UseGuards(JwtAuthGuard)
  hire(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobs.hire(id, userId);
  }

  // ── Dispute evidence ──
  @Post('disputes/:id/evidence')
  @UseGuards(JwtAuthGuard)
  addEvidence(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('url') url: string,
  ) {
    return this.jobs.addEvidence(id, userId, url);
  }

  // ── Job gắn với bài forum (module JOB) ──
  @Post('from-thread')
  @UseGuards(JwtAuthGuard)
  createFromThread(
    @CurrentUser('id') userId: string,
    @Body() body: CreateJobDto & { threadId: string },
  ) {
    const { threadId, ...dto } = body;
    return this.jobs.createForThread(userId, threadId, dto);
  }

  @Get('by-thread/:threadId')
  @UseGuards(OptionalJwtGuard)
  getByThread(@Param('threadId') threadId: string, @CurrentUser('id') userId?: string) {
    return this.jobs.getByThread(threadId, userId);
  }

  // ── Create ──
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser('id') userId: string, @Body() dto: CreateJobDto) {
    return this.jobs.create(userId, dto);
  }

  // ── Single job ──
  @Get(':id')
  @UseGuards(OptionalJwtGuard)
  get(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.jobs.get(id, userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: UpdateJobDto) {
    return this.jobs.update(id, userId, dto);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  cancel(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobs.cancel(id, userId);
  }

  // ── Proposals on a job ──
  @Post(':id/proposals')
  @UseGuards(JwtAuthGuard)
  submitProposal(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SubmitProposalDto,
  ) {
    return this.jobs.submitProposal(userId, id, dto);
  }

  @Get(':id/proposals')
  @UseGuards(JwtAuthGuard)
  listProposals(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobs.listProposals(id, userId);
  }

  @Post(':id/invite')
  @UseGuards(JwtAuthGuard)
  invite(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('freelancerId') freelancerId: string,
  ) {
    return this.jobs.inviteFreelancer(id, userId, freelancerId);
  }

  // ── Workflow ──
  @Post(':id/submit-work')
  @UseGuards(JwtAuthGuard)
  submitWork(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('note') note: string,
  ) {
    return this.jobs.submitWork(id, userId, note);
  }

  @Post(':id/request-revision')
  @UseGuards(JwtAuthGuard)
  requestRevision(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('note') note?: string,
  ) {
    return this.jobs.requestRevision(id, userId, note);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobs.approve(id, userId);
  }

  // ── Disputes ──
  @Post(':id/dispute')
  @UseGuards(JwtAuthGuard)
  openDispute(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.jobs.openDispute(id, userId, reason);
  }

  // ── Reviews ──
  @Post(':id/review')
  @UseGuards(JwtAuthGuard)
  leaveReview(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    return this.jobs.leaveReview(id, userId, Number(body.rating), body.comment);
  }

  // ── Bookmarks ──
  @Get(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  bookmarkState(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobs.getBookmarkState(userId, id);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  toggleBookmark(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.jobs.toggleBookmark(userId, id);
  }
}
