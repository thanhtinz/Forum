import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { GiftcodeService, CreateGiftCodeDto } from './giftcode.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles, RolesGuard, CurrentUser } from '../../common/decorators/roles.decorator';

@Controller('giftcode')
export class GiftcodeController {
  constructor(private readonly giftcode: GiftcodeService) {}

  // ── Người dùng nhập mã ──
  @Post('redeem')
  @UseGuards(JwtAuthGuard)
  redeem(@CurrentUser('id') userId: string, @Body('code') code: string) {
    return this.giftcode.redeem(userId, code);
  }

  // ── Admin ──
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  list() {
    return this.giftcode.list();
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateGiftCodeDto) {
    return this.giftcode.create(dto);
  }

  @Post('admin/:id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  toggle(@Param('id') id: string) {
    return this.giftcode.toggle(id);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.giftcode.remove(id);
  }
}
