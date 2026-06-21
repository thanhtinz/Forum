import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { TriviaService, TriviaDto } from './trivia.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('quiz')
export class QuizController {
  constructor(private readonly trivia: TriviaService) {}

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
}
