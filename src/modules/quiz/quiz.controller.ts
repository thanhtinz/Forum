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
import { UserRole } from '@prisma/client';
import { TriviaService, TriviaDto } from './trivia.service';
import { PredictionService, CreatePredictionDto } from './prediction.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('quiz')
export class QuizController {
  constructor(
    private readonly trivia: TriviaService,
    private readonly predictions: PredictionService,
  ) {}

  // ── Trivia (Đố vui) ──
  @Get('trivia/today')
  @UseGuards(OptionalJwtGuard)
  triviaToday(@CurrentUser('id') userId?: string) {
    return this.trivia.getToday(userId);
  }

  @Post('trivia/:id/answer')
  @UseGuards(JwtAuthGuard)
  triviaAnswer(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('choiceIndex') choiceIndex: number,
  ) {
    return this.trivia.answer(userId, id, Number(choiceIndex));
  }

  // Admin trivia
  @Get('admin/trivia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  triviaList() {
    return this.trivia.list();
  }

  @Post('admin/trivia')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  triviaCreate(@Body() dto: TriviaDto) {
    return this.trivia.create(dto);
  }

  @Patch('admin/trivia/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  triviaUpdate(@Param('id') id: string, @Body() dto: TriviaDto) {
    return this.trivia.update(id, dto);
  }

  @Delete('admin/trivia/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  triviaDelete(@Param('id') id: string) {
    return this.trivia.delete(id);
  }

  // ── Predictions (Kèo dự đoán) ──
  private isMod(role?: UserRole) {
    return role === UserRole.ADMIN || role === UserRole.MODERATOR;
  }

  @Get('predictions')
  @UseGuards(OptionalJwtGuard)
  predictionList(
    @CurrentUser('id') userId: string | undefined,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('marketType') marketType?: string,
    @Query('q') q?: string,
    @Query('mine') mine?: string,
    @Query('sort') sort?: string,
  ) {
    return this.predictions.list({ status, category, marketType, q, mine, sort }, userId);
  }

  @Get('predictions/my-bets')
  @UseGuards(JwtAuthGuard)
  predictionMyBets(@CurrentUser('id') userId: string) {
    return this.predictions.myBets(userId);
  }

  @Get('predictions/stats')
  @UseGuards(JwtAuthGuard)
  predictionStats(@CurrentUser('id') userId: string) {
    return this.predictions.playerStats(userId);
  }

  @Get('predictions/:id')
  @UseGuards(OptionalJwtGuard)
  predictionGet(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.predictions.get(id, userId);
  }

  // Tạo kèo (mọi thành viên). Admin có thể bật isAdminMarket (nhà cái = hệ thống).
  @Post('predictions')
  @UseGuards(JwtAuthGuard)
  predictionCreateUser(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body() dto: CreatePredictionDto,
  ) {
    return this.predictions.create(dto, userId, this.isMod(role));
  }

  @Post('predictions/:id/bet')
  @UseGuards(JwtAuthGuard)
  predictionBet(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('optionIndex') optionIndex: number,
    @Body('amount') amount: number,
    @Body('password') password?: string,
  ) {
    return this.predictions.bet(userId, id, Number(optionIndex), Number(amount), password);
  }

  @Get('predictions/:id/comments')
  @UseGuards(OptionalJwtGuard)
  predictionComments(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.predictions.listComments(id, userId);
  }

  @Post('predictions/react')
  @UseGuards(JwtAuthGuard)
  predictionReact(
    @CurrentUser('id') userId: string,
    @Body('targetType') targetType: string,
    @Body('targetId') targetId: string,
    @Body('emoji') emoji: string,
  ) {
    return this.predictions.toggleReaction(userId, targetType, targetId, emoji);
  }

  @Post('predictions/:id/comments')
  @UseGuards(JwtAuthGuard)
  predictionAddComment(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
    @Body('parentId') parentId?: string,
  ) {
    return this.predictions.addComment(id, userId, content, parentId);
  }

  @Delete('predictions/comments/:commentId')
  @UseGuards(JwtAuthGuard)
  predictionDeleteComment(@Param('commentId') commentId: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.predictions.deleteComment(commentId, userId, this.isMod(role));
  }

  @Post('predictions/bets/:betId/cashout')
  @UseGuards(JwtAuthGuard)
  predictionCashout(@Param('betId') betId: string, @CurrentUser('id') userId: string) {
    return this.predictions.cashout(userId, betId);
  }

  // ── Cược xiên (Parlay) ──
  @Post('parlays')
  @UseGuards(JwtAuthGuard)
  placeParlay(
    @CurrentUser('id') userId: string,
    @Body('legs') legs: { predictionId: string; optionIndex: number }[],
    @Body('amount') amount: number,
  ) {
    return this.predictions.placeParlay(userId, legs, Number(amount));
  }

  @Get('parlays/mine')
  @UseGuards(JwtAuthGuard)
  myParlays(@CurrentUser('id') userId: string) {
    return this.predictions.myParlays(userId);
  }

  // ── Phân tích người tạo kèo ──
  @Get('predictions/creator/stats')
  @UseGuards(JwtAuthGuard)
  creatorStats(@CurrentUser('id') userId: string) {
    return this.predictions.creatorStats(userId);
  }

  @Get('predictions/:id/analytics')
  @UseGuards(JwtAuthGuard)
  predictionAnalytics(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.predictions.analytics(id, userId, this.isMod(role));
  }

  // ── Kích hoạt tác vụ tự động thủ công (admin) ──
  @Post('admin/predictions/run-auto')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async runAuto() {
    const locked = await this.predictions.autoLockAll();
    const ext = await this.predictions.resolveExternalPending();
    return { locked, ...ext };
  }

  @Post('predictions/:id/lock')
  @UseGuards(JwtAuthGuard)
  predictionLockUser(@Param('id') id: string, @CurrentUser('id') userId: string, @CurrentUser('role') role: UserRole) {
    return this.predictions.lock(id, userId, this.isMod(role));
  }

  @Post('predictions/:id/settle')
  @UseGuards(JwtAuthGuard)
  predictionSettleUser(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body('correctIndex') correctIndex: number,
    @Body('note') note?: string,
  ) {
    return this.predictions.settle(id, Number(correctIndex), userId, this.isMod(role), note);
  }

  @Post('predictions/:id/cancel')
  @UseGuards(JwtAuthGuard)
  predictionCancelUser(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: UserRole,
    @Body('reason') reason?: string,
  ) {
    return this.predictions.cancel(id, userId, this.isMod(role), reason);
  }

  // ── Admin (tương thích trang quản trị cũ) ──
  @Post('admin/predictions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  predictionCreate(@CurrentUser('id') userId: string, @Body() dto: CreatePredictionDto) {
    return this.predictions.create({ isAdminMarket: true, ...dto }, userId, true);
  }

  @Post('admin/predictions/:id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  predictionLock(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.predictions.lock(id, userId, true);
  }

  @Post('admin/predictions/:id/settle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  predictionSettle(@Param('id') id: string, @CurrentUser('id') userId: string, @Body('correctIndex') correctIndex: number) {
    return this.predictions.settle(id, Number(correctIndex), userId, true);
  }

  @Delete('admin/predictions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  predictionDelete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.predictions.delete(id, userId, true);
  }
}
