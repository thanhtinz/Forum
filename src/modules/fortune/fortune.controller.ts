import { Body, Controller, Get, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FortuneService, FortuneConfig } from './fortune.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('fortune')
export class FortuneController {
  constructor(private readonly fortune: FortuneService) {}

  // Cấu hình công khai (giá + bật AI) để client hiển thị
  @Get('config')
  publicConfig() {
    return this.fortune.getPublicConfig();
  }

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
  tarot(@CurrentUser('id') userId: string | undefined, @Body() b: { n?: number; question?: string; topic?: string }) {
    return this.fortune.tarot(Number(b.n ?? 3), b.question, userId, b.topic);
  }

  // 12 cung hoàng đạo
  @Get('zodiac/list')
  zodiacList() { return this.fortune.zodiacList(); }

  @Get('zodiac')
  zodiac(@Query('sign') sign?: string, @Query('date') date?: string) {
    return this.fortune.zodiac({ sign, date });
  }

  @Post('meihua')
  @UseGuards(OptionalJwtGuard)
  meihua(@CurrentUser('id') userId: string | undefined, @Body() b: { num1?: number; num2?: number; question?: string }) {
    return this.fortune.meihua(
      { num1: b.num1 ? Number(b.num1) : undefined, num2: b.num2 ? Number(b.num2) : undefined, question: b.question },
      userId,
    );
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  history(@CurrentUser('id') userId: string, @Query('type') type?: string, @Query('page') page = 1) {
    return this.fortune.history(userId, type, Number(page));
  }

  // ── ADMIN: cấu hình giá + AI ──
  @Get('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminConfig() {
    return this.fortune.getConfig();
  }

  @Put('admin/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminSetConfig(@Body() patch: Partial<FortuneConfig>) {
    return this.fortune.setConfig(patch);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  adminStats() {
    return this.fortune.stats();
  }
}
