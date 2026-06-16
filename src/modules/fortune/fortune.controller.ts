import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FortuneService } from './fortune.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('fortune')
export class FortuneController {
  constructor(private readonly fortune: FortuneService) {}

  // Công khai: chơi không cần đăng nhập; nếu đăng nhập thì tự lưu lịch sử
  @Post('bazi')
  @UseGuards(OptionalJwtGuard)
  bazi(
    @CurrentUser('id') userId: string | undefined,
    @Body() b: { year: number; month: number; day: number; hour: number; minute?: number },
  ) {
    return this.fortune.bazi(
      { year: Number(b.year), month: Number(b.month), day: Number(b.day), hour: Number(b.hour), minute: Number(b.minute ?? 0) },
      userId,
    );
  }

  @Post('tarot')
  @UseGuards(OptionalJwtGuard)
  tarot(
    @CurrentUser('id') userId: string | undefined,
    @Body() b: { n?: number; question?: string },
  ) {
    return this.fortune.tarot(Number(b.n ?? 3), b.question, userId);
  }

  @Post('meihua')
  @UseGuards(OptionalJwtGuard)
  meihua(
    @CurrentUser('id') userId: string | undefined,
    @Body() b: { num1?: number; num2?: number; question?: string },
  ) {
    return this.fortune.meihua(
      { num1: b.num1 ? Number(b.num1) : undefined, num2: b.num2 ? Number(b.num2) : undefined, question: b.question },
      userId,
    );
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  history(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('page') page = 1,
  ) {
    return this.fortune.history(userId, type, Number(page));
  }
}
