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

  // ── Predictions (Dự đoán) ──
  @Get('predictions')
  predictionList(@Query('status') status?: string) {
    return this.predictions.list({ status });
  }

  @Get('predictions/:id')
  @UseGuards(OptionalJwtGuard)
  predictionGet(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    return this.predictions.get(id, userId);
  }

  @Post('predictions/:id/bet')
  @UseGuards(JwtAuthGuard)
  predictionBet(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body('optionIndex') optionIndex: number,
    @Body('amount') amount: number,
  ) {
    return this.predictions.bet(userId, id, Number(optionIndex), Number(amount));
  }

  // Admin predictions
  @Post('admin/predictions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  predictionCreate(@CurrentUser('id') userId: string, @Body() dto: CreatePredictionDto) {
    return this.predictions.create(dto, userId);
  }

  @Post('admin/predictions/:id/lock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  predictionLock(@Param('id') id: string) {
    return this.predictions.lock(id);
  }

  @Post('admin/predictions/:id/settle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  predictionSettle(@Param('id') id: string, @Body('correctIndex') correctIndex: number) {
    return this.predictions.settle(id, Number(correctIndex));
  }

  @Delete('admin/predictions/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  predictionDelete(@Param('id') id: string) {
    return this.predictions.delete(id);
  }
}
